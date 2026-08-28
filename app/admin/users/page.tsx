'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import AdminNav from '../AdminNav';
import styles from './users.module.css';

const ADMIN_URL = 'https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-operations';
const ADMIN_USERS_URL = 'https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-users';
const PAGE_SIZE = 10;

type SavedAddress = {
  label?: string | null;
  address_line1?: string | null;
  city?: string | null;
  state_region?: string | null;
  country?: string | null;
};

type UserRow = {
  user_id: string;
  email?: string | null;
  full_name?: string | null;
  role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
  provider_approved: boolean;
  phone_number?: string | null;
  is_phone_verified: boolean;
  profile_photo_url?: string | null;
  photoUrl?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state_region?: string | null;
  postal_code?: string | null;
  country?: string | null;
  defaultServiceAddress?: SavedAddress | null;
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string | null;
  last_seen_at?: string | null;
  email_confirmed_at?: string | null;
  account_status?: string | null;
  status?: string | null;
  business_name?: string | null;
  service_category?: string | null;
  subscription_plan?: string | null;
  request_count?: number | null;
  open_request_count?: number | null;
  completed_request_count?: number | null;
  average_rating?: number | null;
  provider_is_suspended?: boolean | null;
  suspension_reason?: string | null;
};

type PermissionRow = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  resource: string;
  action: string;
  role_default: boolean;
  override: boolean | null;
  effective_enabled: boolean;
  updated_at?: string | null;
};

type RoleFilter = 'ALL' | 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
type NoticeTone = 'loading' | 'success' | 'error' | 'info';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [busyUser, setBusyUser] = useState('');
  const [message, setMessage] = useState('Loading user accounts…');
  const [noticeTone, setNoticeTone] = useState<NoticeTone>('loading');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [busyPermission, setBusyPermission] = useState('');

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setPage(1);
    setSelectedUserId(null);
    setPermissions([]);
  }, [query, roleFilter]);

  async function jwt() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      window.location.href = '/login';
      return '';
    }
    setCurrentUserId(data.session.user.id);
    return data.session.access_token;
  }

  async function call(url: string, body: Record<string, unknown> = {}) {
    const token = await jwt();
    if (!token) return null;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error || 'Admin request failed');
    return payload;
  }

  async function load() {
    setLoading(true);
    setNoticeTone('loading');
    setMessage('Loading user accounts…');
    try {
      const payload = await call(ADMIN_USERS_URL);
      if (!payload) return;
      setUsers(
        (payload.users || []).filter(
          (user: UserRow) => String(user.account_status || 'ACTIVE').toUpperCase() !== 'DEACTIVATED',
        ),
      );
      setLastUpdated(new Date());
      setNoticeTone('success');
      setMessage('User accounts are up to date.');
    } catch (error) {
      setNoticeTone('error');
      setMessage(error instanceof Error ? error.message : 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  }

  async function loadPermissions(userId: string) {
    setPermissionsLoading(true);
    try {
      const payload = await call(ADMIN_USERS_URL, { action: 'get_permissions', targetUserId: userId });
      setPermissions(payload?.permissions || []);
    } catch (error) {
      setPermissions([]);
      setNoticeTone('error');
      setMessage(error instanceof Error ? error.message : 'Unable to load user permissions.');
    } finally {
      setPermissionsLoading(false);
    }
  }

  async function openUser(row: UserRow) {
    if (selectedUserId === row.user_id) {
      setSelectedUserId(null);
      setPermissions([]);
      return;
    }
    setSelectedUserId(row.user_id);
    setPermissions([]);
    await loadPermissions(row.user_id);
  }

  async function setPermission(row: UserRow, permission: PermissionRow, enabled: boolean) {
    if (permission.effective_enabled === enabled) return;
    setBusyPermission(permission.id);
    try {
      await call(ADMIN_USERS_URL, {
        action: 'set_permission',
        targetUserId: row.user_id,
        permissionId: permission.id,
        enabled,
      });
      setPermissions((list) =>
        list.map((item) =>
          item.id === permission.id
            ? { ...item, override: enabled, effective_enabled: enabled, updated_at: new Date().toISOString() }
            : item,
        ),
      );
      setNoticeTone('success');
      setMessage(`${permission.name} ${enabled ? 'enabled' : 'disabled'} for ${userRef(row)}.`);
    } catch (error) {
      setNoticeTone('error');
      setMessage(error instanceof Error ? error.message : 'Unable to update permission.');
    } finally {
      setBusyPermission('');
    }
  }

  async function changeRole(row: UserRow, role: 'CUSTOMER' | 'PROVIDER') {
    setBusyUser(row.user_id);
    try {
      await call(ADMIN_URL, {
        action: 'set_user_role',
        targetUserId: row.user_id,
        role,
        providerApproved: role === 'PROVIDER' ? row.provider_approved : false,
      });
      await load();
      if (selectedUserId === row.user_id) await loadPermissions(row.user_id);
      setNoticeTone('success');
      setMessage(`${userRef(row)} changed to ${role}.`);
    } catch (error) {
      setNoticeTone('error');
      setMessage(error instanceof Error ? error.message : 'Unable to change role.');
    } finally {
      setBusyUser('');
    }
  }

  async function setSuspended(row: UserRow, suspended: boolean) {
    const name = userRef(row);
    const reason = suspended ? window.prompt(`Reason for suspending ${name} (optional):`, '') || '' : null;
    if (
      suspended &&
      !window.confirm(
        `Suspend ${name}? ${
          row.role === 'PROVIDER'
            ? 'They will stop receiving new service requests.'
            : 'They will not be able to make new service requests.'
        }`,
      )
    )
      return;

    setBusyUser(row.user_id);
    try {
      await call(ADMIN_URL, { action: 'set_account_suspension', targetUserId: row.user_id, suspended, reason });
      await load();
      setNoticeTone('success');
      setMessage(suspended ? `${name} suspended.` : `${name} reactivated.`);
    } catch (error) {
      setNoticeTone('error');
      setMessage(error instanceof Error ? error.message : 'Unable to update account status.');
    } finally {
      setBusyUser('');
    }
  }

  async function deleteUser(row: UserRow) {
    const name = userRef(row);
    if (row.role === 'ADMIN' || row.user_id === currentUserId) return;
    const confirmed = window.confirm(
      `Delete ${name}? The account will be disabled and removed from active users, while historical records are retained.`,
    );
    if (!confirmed) return;

    setBusyUser(row.user_id);
    try {
      const { error } = await supabase.rpc('admin_deactivate_user', { p_target_user_id: row.user_id });
      if (error) throw error;
      setSelectedUserId(null);
      setPermissions([]);
      setUsers((list) => list.filter((user) => user.user_id !== row.user_id));
      setNoticeTone('success');
      setMessage(`${name} was deleted from active users. Historical records were retained.`);
    } catch (error) {
      setNoticeTone('error');
      setMessage(error instanceof Error ? error.message : 'Unable to delete user account.');
    } finally {
      setBusyUser('');
    }
  }

  function avatar(user: UserRow) {
    const src = user.photoUrl || (/^https?:\/\//i.test(user.profile_photo_url || '') ? user.profile_photo_url : null);
    const initial = (user.full_name || user.phone_number || user.email || 'U').slice(0, 1).toUpperCase();
    return src ? (
      <img className="userAvatar" src={src} alt={`${user.full_name || 'User'} profile`} />
    ) : (
      <span className="userAvatar userAvatarFallback" aria-label="No profile photo">
        {initial}
      </span>
    );
  }

  function coreAddress(user: UserRow) {
    return [user.address_line1, user.address_line2, user.city, user.state_region, user.postal_code, user.country]
      .filter(Boolean)
      .join(', ');
  }

  function defaultAddress(user: UserRow) {
    const address = user.defaultServiceAddress;
    return address
      ? [address.label, address.address_line1, address.city, address.state_region, address.country].filter(Boolean).join(' · ')
      : '';
  }

  function date(value?: string | null) {
    if (!value) return 'Not available';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 'Not available' : parsed.toLocaleString();
  }

  function userRef(user: UserRow) {
    return user.full_name?.trim() || user.phone_number?.trim() || user.email?.trim() || 'Unnamed user';
  }

  function accountState(user: UserRow) {
    const status = String(user.account_status || user.status || 'ACTIVE').toUpperCase();
    if (status === 'SUSPENDED' || user.provider_is_suspended === true) return 'SUSPENDED';
    if (user.role === 'ADMIN') return 'ADMIN';
    if (user.role === 'PROVIDER' && !user.provider_approved) return 'PENDING';
    return 'ACTIVE';
  }

  function privilegeLevel(user: UserRow) {
    const state = accountState(user);
    if (state === 'SUSPENDED') return 'Access suspended';
    if (user.role === 'ADMIN') return 'Full administrative access';
    if (user.role === 'PROVIDER') return user.provider_approved ? 'Approved provider' : 'Provider approval pending';
    return 'Customer access';
  }

  function userRights(user: UserRow) {
    if (user.role === 'ADMIN') return 'Manage users providers requests settings reports activity';
    if (user.role === 'PROVIDER')
      return 'Receive service requests manage assigned work update job status manage provider locations customer requests';
    return 'Create service requests view manage own requests service locations rate completed services';
  }

  const counts = useMemo(
    () => ({
      ALL: users.length,
      CUSTOMER: users.filter((user) => user.role === 'CUSTOMER').length,
      PROVIDER: users.filter((user) => user.role === 'PROVIDER').length,
      ADMIN: users.filter((user) => user.role === 'ADMIN').length,
    }),
    [users],
  );

  const visible = useMemo(
    () =>
      users
        .filter((user) => {
          const text = `${user.full_name || ''} ${user.email || ''} ${user.phone_number || ''} ${user.role} ${
            user.user_id
          } ${user.account_status || ''} ${privilegeLevel(user)} ${userRights(user)}`.toLowerCase();
          return (
            (roleFilter === 'ALL' || user.role === roleFilter) &&
            (!query.trim() || text.includes(query.trim().toLowerCase()))
          );
        })
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime() ||
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        ),
    [users, query, roleFilter],
  );

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pagedVisible = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const selected = users.find((user) => user.user_id === selectedUserId) || null;

  function permissionPanel(user: UserRow) {
    const protectedAdmin = user.role === 'ADMIN';
    return (
      <section className="permissionPanel" aria-label="User rights and privileges">
        <div className="permissionHeader">
          <div>
            <p className="eyebrow">RIGHTS & PRIVILEGES</p>
            <h3>Permissions</h3>
            <p className="muted">Role defaults are shown below. User-specific changes are saved as overrides.</p>
          </div>
          <span className={`permissionSummary ${protectedAdmin ? 'protected' : ''}`}>
            {protectedAdmin ? 'Protected admin' : `${permissions.filter((item) => item.effective_enabled).length} enabled`}
          </span>
        </div>

        {permissionsLoading ? (
          <div className="permissionEmpty">Loading permissions…</div>
        ) : permissions.length ? (
          <div className="permissionList">
            {permissions.map((permission) => (
              <div className={`permissionRow ${permission.effective_enabled ? 'enabled' : 'disabled'}`} key={permission.id}>
                <div className="permissionInfo">
                  <div className="permissionTitle">
                    <strong>{permission.name}</strong>
                    <span className={`permissionState ${permission.effective_enabled ? 'enabled' : 'disabled'}`}>
                      {permission.effective_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p>{permission.description || permission.code}</p>
                  <small>
                    {permission.code}
                    {permission.override !== null ? ' · Custom override' : ' · Role default'}
                  </small>
                </div>
                <div className="permissionControls" aria-label={`${permission.name} permission`}>
                  <button
                    className={permission.effective_enabled ? 'active enable' : ''}
                    disabled={protectedAdmin || busyPermission === permission.id}
                    onClick={() => void setPermission(user, permission, true)}
                  >
                    Enable
                  </button>
                  <button
                    className={!permission.effective_enabled ? 'active disable' : ''}
                    disabled={protectedAdmin || busyPermission === permission.id}
                    onClick={() => void setPermission(user, permission, false)}
                  >
                    Disable
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="permissionEmpty">No editable permissions are configured for this role.</div>
        )}

        {protectedAdmin ? (
          <p className="permissionNote">Admin permissions are protected to prevent accidental administrative lockout.</p>
        ) : null}
      </section>
    );
  }

  function detailPanel(user: UserRow) {
    const state = accountState(user);
    return (
      <section className="inlineUserDetail" aria-label={`${userRef(user)} account details`}>
        <div className="detailHeader">
          <div className="detailIdentity">
            {avatar(user)}
            <div>
              <p className="eyebrow">USER ACCOUNT</p>
              <h2>{userRef(user)}</h2>
              <p className="muted">{user.phone_number || user.email || 'No contact information'}</p>
            </div>
          </div>
          <button
            className="secondary detailClose"
            onClick={() => {
              setSelectedUserId(null);
              setPermissions([]);
            }}
          >
            Close
          </button>
        </div>

        <div className="detailGrid">
          <div className="detailFact"><b>Account status</b><span>{state}</span></div>
          <div className="detailFact"><b>Role</b><span>{user.role}</span></div>
          <div className="detailFact"><b>Access</b><span>{privilegeLevel(user)}</span></div>
          <div className="detailFact"><b>Phone</b><span>{user.phone_number || 'Not available'}</span></div>
          <div className="detailFact"><b>Phone verification</b><span>{user.phone_number ? (user.is_phone_verified ? 'Verified' : 'Unverified') : 'Not available'}</span></div>
          <div className="detailFact"><b>Email</b><span>{user.email || 'Not available'}</span></div>
          <div className="detailFact"><b>Email verification</b><span>{user.email_confirmed_at ? 'Verified' : 'Not verified'}</span></div>
          <div className="detailFact"><b>Joined</b><span>{date(user.created_at)}</span></div>
          <div className="detailFact"><b>Last active</b><span>{date(user.last_seen_at || user.last_sign_in_at)}</span></div>
          <div className="detailFact"><b>Requests</b><span>{user.request_count ?? 0}</span></div>
          <div className="detailFact"><b>Open requests</b><span>{user.open_request_count ?? 0}</span></div>
          <div className="detailFact"><b>Completed</b><span>{user.completed_request_count ?? 0}</span></div>
          <div className="detailFact detailWide"><b>Account address</b><span>{coreAddress(user) || 'Not available'}</span></div>
          <div className="detailFact detailWide"><b>Default service address</b><span>{defaultAddress(user) || 'Not available'}</span></div>
          <div className="detailFact detailWide"><b>User ID</b><span>{user.user_id}</span></div>
          {user.business_name ? <div className="detailFact"><b>Business name</b><span>{user.business_name}</span></div> : null}
          {user.suspension_reason ? <div className="detailFact detailWide"><b>Suspension reason</b><span>{user.suspension_reason}</span></div> : null}
        </div>

        {permissionPanel(user)}

        <div className="userRowActions detailActions">
          {user.role === 'PROVIDER' ? (
            <a className="secondary compactButton" href={`/admin/providers/${user.user_id}`}>Open Provider Record</a>
          ) : null}
          {user.role !== 'ADMIN' && user.role !== 'CUSTOMER' ? (
            <button className="secondary compactButton" disabled={busyUser === user.user_id} onClick={() => void changeRole(user, 'CUSTOMER')}>
              Change to Customer
            </button>
          ) : null}
          {user.role !== 'ADMIN' && user.role !== 'PROVIDER' ? (
            <button className="primary compactButton" disabled={busyUser === user.user_id} onClick={() => void changeRole(user, 'PROVIDER')}>
              Set as Provider
            </button>
          ) : null}
          {user.role !== 'ADMIN' ? (
            state === 'SUSPENDED' ? (
              <button className="primary compactButton" disabled={busyUser === user.user_id} onClick={() => void setSuspended(user, false)}>
                Reactivate
              </button>
            ) : (
              <button className="secondary compactButton" disabled={busyUser === user.user_id} onClick={() => void setSuspended(user, true)}>
                Suspend
              </button>
            )
          ) : (
            <span className="protectedAccountNote">Protected admin account</span>
          )}
          {user.role !== 'ADMIN' && user.user_id !== currentUserId ? (
            <button className="danger compactButton" disabled={busyUser === user.user_id} onClick={() => void deleteUser(user)}>
              {busyUser === user.user_id ? 'Deleting…' : 'Delete Account'}
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  const noticeIcon = noticeTone === 'error' ? '!' : noticeTone === 'loading' ? '↻' : noticeTone === 'success' ? '✓' : 'i';

  return (
    <main className={`${styles.page} shell`}>
      <header className="usersTopbar">
        <div>
          <p className="eyebrow">ADMIN WORKSPACE</p>
          <h1 className="pageTitle">User Management</h1>
          <p className="tagline">Find an account, review access, and take action without leaving the user list.</p>
        </div>
        <button className="primary refreshAction" onClick={() => void load()} disabled={loading}>
          <span aria-hidden="true">↻</span>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      <AdminNav />

      <section className="usersToolbarPanel" aria-label="User search and filters">
        <div className={`usersStatusBar usersStatus-${noticeTone}`} role="status">
          <span className="statusIcon" aria-hidden="true">{noticeIcon}</span>
          <span className="statusCopy">
            <b>{message}</b>
            {lastUpdated ? <small>Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small> : null}
          </span>
        </div>

        <label className="usersSearchRow">
          <span className="searchLabel">Search users</span>
          <span className="usersSearchBox">
            <span aria-hidden="true">⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, phone, email or user ID"
              autoComplete="off"
            />
            {query ? <button type="button" className="clearSearch" onClick={() => setQuery('')} aria-label="Clear search">×</button> : null}
          </span>
        </label>

        <div className="usersFilterRow" role="group" aria-label="Filter users by role">
          {(['ALL', 'CUSTOMER', 'PROVIDER', 'ADMIN'] as const).map((filter) => (
            <button
              key={filter}
              className={`userFilter userFilter-${filter.toLowerCase()} ${roleFilter === filter ? 'active' : ''}`}
              onClick={() => setRoleFilter(filter)}
              aria-pressed={roleFilter === filter}
            >
              <span>{filter === 'ALL' ? 'All' : filter[0] + filter.slice(1).toLowerCase()}</span>
              <strong>{counts[filter]}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="usersListPanel">
        <div className="listHeader">
          <div>
            <p className="eyebrow">ACCOUNTS</p>
            <h2>{roleFilter === 'ALL' ? 'All Users' : roleFilter[0] + roleFilter.slice(1).toLowerCase()}</h2>
            <p className="muted">{visible.length} result{visible.length === 1 ? '' : 's'} · newest first</p>
          </div>
          {query ? <span className="activeQuery">Search: “{query}”</span> : null}
        </div>

        <div className="usersList">
          {pagedVisible.map((user) => {
            const state = accountState(user);
            const tone = state.toLowerCase();
            return (
              <div key={user.user_id} className="userListItem">
                <article className={`userCard userCard-${tone} ${selectedUserId === user.user_id ? 'isOpen' : ''}`}>
                  <div className="userCardMain">
                    {avatar(user)}
                    <div className="userIdentity">
                      <div className="userNameRow">
                        <strong>{user.full_name || 'Unnamed user'}</strong>
                        <span className={`userStatus userStatus-${tone}`}>
                          {state === 'PENDING' ? 'Pending approval' : state[0] + state.slice(1).toLowerCase()}
                        </span>
                      </div>
                      <span className="userPrimaryContact">{user.phone_number || 'Phone not available'}</span>
                      <span className="userSecondaryContact">{user.email || 'Email not provided'}</span>
                    </div>
                  </div>

                  <div className="userMeta">
                    <span><b>Role</b>{user.role[0] + user.role.slice(1).toLowerCase()}</span>
                    <span><b>Access</b>{privilegeLevel(user)}</span>
                    <span><b>Joined</b>{date(user.created_at)}</span>
                    <span><b>Last active</b>{date(user.last_seen_at || user.last_sign_in_at)}</span>
                  </div>

                  <div className="userCardFooter">
                    <span className="verificationSummary">
                      <i className={user.is_phone_verified ? 'verified' : 'unverified'} aria-hidden="true" />
                      Phone {user.is_phone_verified ? 'verified' : 'not verified'}
                    </span>
                    <button className="primary openUserButton" onClick={() => void openUser(user)} aria-expanded={selectedUserId === user.user_id}>
                      {selectedUserId === user.user_id ? 'Close details' : 'Manage user'}
                    </button>
                  </div>
                </article>
                {selectedUserId === user.user_id && selected ? detailPanel(selected) : null}
              </div>
            );
          })}

          {!visible.length ? (
            <div className="emptyQueue">
              <strong>No users found</strong>
              <span>Try a different search or role filter.</span>
              {(query || roleFilter !== 'ALL') ? (
                <button type="button" className="secondary" onClick={() => { setQuery(''); setRoleFilter('ALL'); }}>
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {visible.length > PAGE_SIZE ? (
          <div className="paginationBar">
            <button className="secondary" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Previous
            </button>
            <span className="muted">Page {page} of {totalPages}</span>
            <button className="secondary" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
              Next
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
