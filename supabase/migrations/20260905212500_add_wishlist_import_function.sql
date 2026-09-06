create or replace function public.import_wishlist_definition(
  p_definition jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wishlist_id bigint;
  v_slug text;
  v_gift_count integer;
begin
  if p_definition is null
    or jsonb_typeof(p_definition) <> 'object'
  then
    raise exception 'invalid_wishlist_definition';
  end if;

  v_slug := trim(p_definition ->> 'slug');

  if v_slug is null or v_slug = '' then
    raise exception 'wishlist_slug_required';
  end if;

  if exists (
    select 1
    from public.wishlists
    where slug = v_slug
  ) then
    raise exception 'wishlist_slug_exists';
  end if;

  if jsonb_typeof(p_definition -> 'gifts') <> 'array' then
    raise exception 'wishlist_gifts_must_be_array';
  end if;

  insert into public.wishlists (
    slug,
    title,
    owner_name,
    description,
    icon,
    visibility,
    is_featured,
    is_active,
    display_order
  )
  values (
    v_slug,
    p_definition ->> 'title',
    p_definition ->> 'ownerName',
    coalesce(p_definition ->> 'description', ''),
    coalesce(p_definition ->> 'icon', '🎁'),
    coalesce(p_definition ->> 'visibility', 'public'),
    coalesce(
      (p_definition ->> 'isFeatured')::boolean,
      false
    ),
    coalesce(
      (p_definition ->> 'isActive')::boolean,
      true
    ),
    coalesce(
      (p_definition ->> 'displayOrder')::integer,
      100
    )
  )
  returning id into v_wishlist_id;

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
    coalesce(
      (gift ->> 'isVisible')::boolean,
      true
    )
  from jsonb_array_elements(
    p_definition -> 'gifts'
  ) as gift;

  get diagnostics v_gift_count = row_count;

  return jsonb_build_object(
    'wishlistId',
    v_wishlist_id,
    'slug',
    v_slug,
    'giftCount',
    v_gift_count
  );
end;
$$;

revoke all
on function public.import_wishlist_definition(jsonb)
from public;

revoke all
on function public.import_wishlist_definition(jsonb)
from anon;

revoke all
on function public.import_wishlist_definition(jsonb)
from authenticated;

grant execute
on function public.import_wishlist_definition(jsonb)
to service_role;