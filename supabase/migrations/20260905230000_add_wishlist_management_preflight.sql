create or replace function public.management_wishlist_exists(
  p_slug text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.wishlists
    where slug = lower(trim(p_slug))
  );
$$;

revoke all
on function public.management_wishlist_exists(text)
from public;

revoke all
on function public.management_wishlist_exists(text)
from anon;

revoke all
on function public.management_wishlist_exists(text)
from authenticated;

grant execute
on function public.management_wishlist_exists(text)
to service_role;