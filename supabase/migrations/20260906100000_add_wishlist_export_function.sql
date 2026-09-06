create or replace function public.export_wishlist_definition(
  p_slug text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_definition jsonb;
begin
  select jsonb_build_object(
    'slug', w.slug,
    'title', w.title,
    'ownerName', w.owner_name,
    'description', w.description,
    'icon', w.icon,
    'visibility', w.visibility,
    'isFeatured', w.is_featured,
    'isActive', w.is_active,
    'displayOrder', w.display_order,
    'gifts', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'key', g.gift_key,
            'name', g.name,
            'description', g.description,
            'price', g.price,
            'image', g.image,
            'storeUrl', g.store_url,
            'accent', g.accent,
            'displayOrder', g.display_order,
            'isVisible', g.is_visible
          )
          order by g.display_order, g.id
        )
        from public.gifts as g
        where g.wishlist_id = w.id
      ),
      '[]'::jsonb
    )
  )
  into v_definition
  from public.wishlists as w
  where w.slug = lower(trim(p_slug));

  if v_definition is null then
    raise exception 'wishlist_not_found';
  end if;

  return v_definition;
end;
$$;

revoke all
on function public.export_wishlist_definition(text)
from public;

revoke all
on function public.export_wishlist_definition(text)
from anon;

revoke all
on function public.export_wishlist_definition(text)
from authenticated;

grant execute
on function public.export_wishlist_definition(text)
to service_role;
