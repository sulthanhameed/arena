# Row Level Security — the authorisation model

Defined in
[`supabase/migrations/20260101000300_rls_policies.sql`](../../supabase/migrations/20260101000300_rls_policies.sql).

RLS replaces `middleware/auth.js`. Instead of a Node function deciding who may
see what, **Postgres** does — so the rules apply to the web app, a future
mobile app, a script, or anyone who gets hold of the public anon key.

## The two roles that matter

| Role | Who | Notes |
|---|---|---|
| `anon` | a visitor who is not signed in | the key shipped in the browser bundle |
| `authenticated` | a signed-in Supabase Auth user | `auth.uid()` returns their id |
| `service_role` | Edge Functions only | **bypasses RLS** — never expose it to a browser |

## Helper

```sql
create function public.is_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer as $$
  select exists (select 1 from public.profiles p where p.id = uid and p.role = 'admin');
$$;
```

`SECURITY DEFINER` is what prevents infinite recursion: the function reads
`profiles` as its owner, so the `profiles` policy does not re-trigger itself.

## Policy matrix

| Table | `anon` | `authenticated` | admin |
|---|---|---|---|
| `categories` | read | read | read + write |
| `products` | read | read | read + write |
| `reviews` | read | read, insert/update own, delete own | + delete any |
| `profiles` | — | read/update **own** | read/update any |
| `addresses` | — | full access to **own** | — |
| `favourites` | — | full access to **own** | — |
| `orders` | — | read **own** | read all, update status |
| `order_items` | — | read via a visible parent order | all |
| `order_tracking` | — | read via a visible parent order | all |

## The important one: nobody can insert an order

```sql
-- There is deliberately NO "for insert" policy on public.orders
create policy "orders: read own or admin" on public.orders
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
```

The only way to create an order is the `create_order()` RPC, which is
`SECURITY DEFINER` and re-prices the cart from the `products` table:

```sql
v_subtotal := v_subtotal + (v_product.price * v_qty);   -- DB price, not the client's
v_tax      := round(v_subtotal * 0.05, 2);
v_delivery := case when v_subtotal > 500 then 0 else 40 end;
```

Posting `{"product":"crystal-prawn-hargao","qty":1,"price":1}` still produces
a ₹320 subtotal. The old Express code did the same thing in JavaScript — the
difference is that now it is impossible to route around it.

## Privilege-escalation guard

An `UPDATE` policy on `profiles` lets users edit their own row, which would
otherwise let them set `role = 'admin'`. A trigger blocks it:

```sql
create trigger guard_profile_role before update on public.profiles
  for each row execute function public.guard_profile_role();
```

The function raises unless the change is made by an admin (or by
`service_role` / the SQL editor, where `auth.uid()` is `null`).

## Grants come first

RLS only filters rows a role is already allowed to touch. Without a `GRANT`
the request fails earlier with `permission denied`, which is why `anon` has
**no grant at all** on `orders`:

```sql
grant select on public.categories, public.products to anon, authenticated;
grant select on public.orders to authenticated;   -- note: not anon
```

## Testing policies

In the SQL editor you can impersonate a user:

```sql
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000000';

select count(*) from orders;   -- only that user's orders

reset role;
```

Supabase Studio's *Authentication → Policies* page shows the same rules with
a visual editor.
