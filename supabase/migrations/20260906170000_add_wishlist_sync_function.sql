create or replace function public.sync_wishlist_definition(
  p_definition jsonb,
  p_apply boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wishlist_id bigint;
  v_slug text;
  v_plan jsonb;
  v_reserved_conflicts text;
begin
  if p_definition is null
    or jsonb_typeof(p_definition) <> 'object'
  then
    raise exception 'invalid_wishlist_definition';
  end if;

  v_slug := lower(trim(p_definition ->> 'slug'));

  if v_slug is null or v_slug = '' then
    raise exception 'wishlist_slug_required';
  end if;

  if jsonb_typeof(p_definition -> 'gifts') <> 'array' then
    raise exception 'wishlist_gifts_must_be_array';
  end if;

  select w.id
  into v_wishlist_id
  from public.wishlists as w
  where w.slug = v_slug;

  if v_wishlist_id is null then
    raise exception 'wishlist_not_found';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_definition -> 'gifts') as incoming(gift)
    group by incoming.gift ->> 'key'
    having count(*) > 1
  ) then
    raise exception 'duplicate_gift_key';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_definition -> 'gifts') as incoming(gift)
    group by (incoming.gift ->> 'displayOrder')::integer
    having count(*) > 1
  ) then
    raise exception 'duplicate_gift_display_order';
  end if;

  select string_agg(g.gift_key, ', ' order by g.display_order, g.id)
  into v_reserved_conflicts
  from public.gifts as g
  left join jsonb_array_elements(p_definition -> 'gifts') as incoming(gift)
    on incoming.gift ->> 'key' = g.gift_key
  where g.wishlist_id = v_wishlist_id
    and g.reserved_at is not null
    and (
      incoming.gift is null
      or coalesce((incoming.gift ->> 'isVisible')::boolean, true) = false
    );

  if v_reserved_conflicts is not null then
    raise exception 'reserved_gift_hide_conflict:%', v_reserved_conflicts;
  end if;

  with incoming_gifts as (
    select
      gift ->> 'key' as gift_key,
      gift ->> 'name' as name,
      coalesce(gift ->> 'description', '') as description,
      coalesce(gift ->> 'price', '') as price,
      coalesce(gift ->> 'image', '🎁') as image,
      nullif(gift ->> 'storeUrl', '') as store_url,
      coalesce(gift ->> 'accent', 'blue') as accent,
      (gift ->> 'displayOrder')::integer as display_order,
      coalesce((gift ->> 'isVisible')::boolean, true) as is_visible
    from jsonb_array_elements(p_definition -> 'gifts') as source(gift)
  ),
  existing_gifts as (
    select g.*
    from public.gifts as g
    where g.wishlist_id = v_wishlist_id
  ),
  plan_rows as (
    select
      incoming.gift_key,
      incoming.name,
      case
        when existing.id is null then true
        else false
      end as is_add,
      case
        when existing.id is not null
          and (
            existing.name is distinct from incoming.name
            or existing.description is distinct from incoming.description
            or existing.price is distinct from incoming.price
            or existing.image is distinct from incoming.image
            or existing.store_url is distinct from incoming.store_url
            or existing.accent is distinct from incoming.accent
          )
        then true
        else false
      end as is_update,
      case
        when existing.id is not null
          and existing.display_order is distinct from incoming.display_order
        then true
        else false
      end as is_reorder,
      case
        when existing.id is not null
          and existing.is_visible = false
          and incoming.is_visible = true
        then true
        else false
      end as is_restore,
      false as is_hide
    from incoming_gifts as incoming
    left join existing_gifts as existing
      on existing.gift_key = incoming.gift_key

    union all

    select
      existing.gift_key,
      existing.name,
      false,
      false,
      false,
      false,
      true
    from existing_gifts as existing
    left join incoming_gifts as incoming
      on incoming.gift_key = existing.gift_key
    where incoming.gift_key is null
      and existing.is_visible = true
  ),
  categorized as (
    select
      coalesce(
        jsonb_agg(
          jsonb_build_object('key', gift_key, 'name', name)
          order by gift_key
        ) filter (where is_add),
        '[]'::jsonb
      ) as additions,
      coalesce(
        jsonb_agg(
          jsonb_build_object('key', gift_key, 'name', name)
          order by gift_key
        ) filter (where is_update),
        '[]'::jsonb
      ) as updates,
      coalesce(
        jsonb_agg(
          jsonb_build_object('key', gift_key, 'name', name)
          order by gift_key
        ) filter (where is_reorder),
        '[]'::jsonb
      ) as reorders,
      coalesce(
        jsonb_agg(
          jsonb_build_object('key', gift_key, 'name', name)
          order by gift_key
        ) filter (where is_hide),
        '[]'::jsonb
      ) as hides,
      coalesce(
        jsonb_agg(
          jsonb_build_object('key', gift_key, 'name', name)
          order by gift_key
        ) filter (where is_restore),
        '[]'::jsonb
      ) as restores,
      count(*) filter (
        where not is_add
          and not is_update
          and not is_reorder
          and not is_hide
          and not is_restore
      ) as unchanged_count
    from plan_rows
  )
  select jsonb_build_object(
    'slug', v_slug,
    'applied', p_apply,
    'wishlistChanged',
      w.title is distinct from (p_definition ->> 'title')
      or w.owner_name is distinct from (p_definition ->> 'ownerName')
      or w.description is distinct from coalesce(p_definition ->> 'description', '')
      or w.icon is distinct from coalesce(p_definition ->> 'icon', '🎁')
      or w.visibility is distinct from coalesce(p_definition ->> 'visibility', 'public')
      or w.is_featured is distinct from coalesce((p_definition ->> 'isFeatured')::boolean, false)
      or w.is_active is distinct from coalesce((p_definition ->> 'isActive')::boolean, true)
      or w.display_order is distinct from coalesce((p_definition ->> 'displayOrder')::integer, 100),
    'additions', categorized.additions,
    'updates', categorized.updates,
    'reorders', categorized.reorders,
    'hides', categorized.hides,
    'restores', categorized.restores,
    'unchangedCount', categorized.unchanged_count
  )
  into v_plan
  from public.wishlists as w
  cross join categorized
  where w.id = v_wishlist_id;

  if not p_apply then
    return v_plan;
  end if;

  update public.wishlists
  set
    title = p_definition ->> 'title',
    owner_name = p_definition ->> 'ownerName',
    description = coalesce(p_definition ->> 'description', ''),
    icon = coalesce(p_definition ->> 'icon', '🎁'),
    visibility = coalesce(p_definition ->> 'visibility', 'public'),
    is_featured = coalesce((p_definition ->> 'isFeatured')::boolean, false),
    is_active = coalesce((p_definition ->> 'isActive')::boolean, true),
    display_order = coalesce((p_definition ->> 'displayOrder')::integer, 100)
  where id = v_wishlist_id;

  insert into public.gifts (
    wishlist_id,
    gift_key,
    name,
    description,
    price,
    image,
    store_url,
    accent,
    display_order,
    is_visible
  )
  select
    v_wishlist_id,
    gift ->> 'key',
    gift ->> 'name',
    coalesce(gift ->> 'description', ''),
    coalesce(gift ->> 'price', ''),
    coalesce(gift ->> 'image', '🎁'),
    nullif(gift ->> 'storeUrl', ''),
    coalesce(gift ->> 'accent', 'blue'),
    (gift ->> 'displayOrder')::integer,
    coalesce((gift ->> 'isVisible')::boolean, true)
  from jsonb_array_elements(p_definition -> 'gifts') as source(gift)
  on conflict (wishlist_id, gift_key)
  do update set
    name = excluded.name,
    description = excluded.description,
    price = excluded.price,
    image = excluded.image,
    store_url = excluded.store_url,
    accent = excluded.accent,
    display_order = excluded.display_order,
    is_visible = excluded.is_visible;

  update public.gifts as g
  set is_visible = false
  where g.wishlist_id = v_wishlist_id
    and g.is_visible = true
    and not exists (
      select 1
      from jsonb_array_elements(p_definition -> 'gifts') as incoming(gift)
      where incoming.gift ->> 'key' = g.gift_key
    );

  return jsonb_set(v_plan, '{applied}', 'true'::jsonb);
end;
$$;

revoke all
on function public.sync_wishlist_definition(jsonb, boolean)
from public;

revoke all
on function public.sync_wishlist_definition(jsonb, boolean)
from anon;

revoke all
on function public.sync_wishlist_definition(jsonb, boolean)
from authenticated;

grant execute
on function public.sync_wishlist_definition(jsonb, boolean)
to service_role;
