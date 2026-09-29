import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarClock,
  Car,
  Check,
  Crown,
  Filter,
  HandCoins,
  Handshake,
  Image,
  Landmark,
  LockKeyhole,
  MessageSquare,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  Store,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ListPager, MANAGE_PAGE_SIZE } from "@/components/manage/ListPager";
import { ExportCsvButton } from "@/components/manage/ExportCsvButton";
import { LineSkeleton, SectionHeading } from "@/components/site/Empty";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  changeStaffRole,
  inviteStaff,
  listStaff,
  recentAudit,
  revokeStaff,
  staffSession,
  type AuditDateRange,
  type AuditGroup,
  type AuditItem,
  type StaffMember,
  type StaffRoleName,
} from "@/lib/staff.functions";
import { CAPABILITY_ROLE, roleAtLeast, type StaffCapability } from "@/lib/staff-permissions";
import { exportAuditCsv } from "@/lib/manage-exports.functions";

export const Route = createFileRoute("/manage/staff")({
  head: () => ({
    meta: [
      { title: "Staff Access — Shaw Traders EV Manager" },
      { name: "description", content: "Manage staff access and review workspace activity for Shaw Traders EV." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Staff Access — Shaw Traders EV Manager" },
      { property: "og:description", content: "Manage staff access and review workspace activity for Shaw Traders EV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StaffPage,
});

const INVITE_ROLES = ["online_sales", "staff", "manager"] as const;
const STAFF_ROLES: Array<{ value: "all" | StaffRoleName; label: string }> = [
  { value: "all", label: "All roles" },
  { value: "owner", label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
  { value: "online_sales", label: "Sales Manager" },
  { value: "super_admin", label: "Permanent admin" },
];
const ROLE_LABEL: Record<StaffRoleName, string> = {
  super_admin: "Permanent admin",
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
  online_sales: "Sales Manager",
};
const CAPABILITY_LABEL: Record<StaffCapability, string> = {
  "online-orders": "Online orders",
  operations: "Operations",
  catalogue: "Catalogue",
  trade: "Trade & Credit",
  "counter-sales": "Counter sales",
  "vendor-finance": "Vendor finance",
  content: "Content",
  reports: "Reports",
  settings: "Settings",
  "staff.manage": "Staff management",
};
const AUDIT_GROUPS: Array<{ value: AuditGroup; label: string }> = [
  { value: "all", label: "All event types" },
  { value: "staff", label: "Staff" },
  { value: "catalogue", label: "Catalogue / Products" },
  { value: "orders", label: "Orders" },
  { value: "trade", label: "Trade & Credit" },
  { value: "vendors", label: "Vendors" },
  { value: "vehicles", label: "Vehicles" },
  { value: "content", label: "Content" },
  { value: "settings", label: "Settings" },
  { value: "reviews", label: "Reviews & Enquiries" },
  { value: "bookings", label: "Bookings" },
  { value: "counter-sales", label: "Counter sales" },
];

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "ST";
}

function RoleBadge({ role }: { role: StaffRoleName }) {
  const variant = role === "super_admin" ? "default" : role === "owner" ? "secondary" : role === "online_sales" ? "destructive" : "outline";
  return <Badge variant={variant}>{ROLE_LABEL[role]}</Badge>;
}

function ActiveIndicator() {
  return <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />Active</span>;
}

function StaffAvatar({ member, size = "normal" }: { member: StaffMember; size?: "normal" | "large" }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full border border-border bg-surface font-semibold text-foreground ${size === "large" ? "size-14 text-base" : "size-9 text-xs"}`} aria-hidden="true">
      {initials(member.name)}
    </span>
  );
}

function StaffPage() {
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const session = useServerFn(staffSession);
  const list = useServerFn(listStaff);
  const invite = useServerFn(inviteStaff);
  const revoke = useServerFn(revokeStaff);
  const changeRole = useServerFn(changeStaffRole);
  const audit = useServerFn(recentAudit);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | StaffRoleName>("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "name">("newest");
  const [page, setPage] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<(typeof INVITE_ROLES)[number]>("staff");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [details, setDetails] = useState<StaffMember | null>(null);
  const [removeTarget, setRemoveTarget] = useState<StaffMember | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditGroup, setAuditGroup] = useState<AuditGroup>("all");
  const [auditRange, setAuditRange] = useState<AuditDateRange>("all");
  const [auditPage, setAuditPage] = useState(0);

  const { data: me } = useQuery({ queryKey: ["staff-session"], queryFn: () => session() });
  const canManage = Boolean(me?.signedIn && me.superAdmin);
  const staffQuery = useQuery({
    queryKey: ["staff-list", search, roleFilter, sort, page, MANAGE_PAGE_SIZE],
    queryFn: () => list({ data: { q: search, role: roleFilter, sort, page, pageSize: MANAGE_PAGE_SIZE } }),
    placeholderData: (previous) => previous,
  });
  const auditQuery = useQuery({
    queryKey: ["staff-audit", auditSearch, auditGroup, auditRange, auditPage, MANAGE_PAGE_SIZE],
    queryFn: () => audit({ data: { q: auditSearch, entityGroup: auditGroup, dateRange: auditRange, page: auditPage, pageSize: MANAGE_PAGE_SIZE } }),
    enabled: auditOpen,
    placeholderData: (previous) => previous,
  });
  const members = staffQuery.data?.items ?? [];
  const total = staffQuery.data?.total ?? 0;

  const inviteMutation = useMutation({
    mutationFn: () => invite({ data: { email, name, role } }),
    onSuccess: (res) => {
      if ("error" in res && res.error) return toast.error(res.error);
      setTempPassword(("tempPassword" in res && res.tempPassword) || null);
      setEmail("");
      setName("");
      setRole("staff");
      toast.success("Access granted");
      void qc.invalidateQueries({ queryKey: ["staff-list"] });
      void qc.invalidateQueries({ queryKey: ["staff-audit"] });
      if (!("tempPassword" in res && res.tempPassword)) setInviteOpen(false);
    },
    onError: () => toast.error("Check the name, email, and role, then try again."),
  });
  const revokeMutation = useMutation({
    mutationFn: (profileId: string) => revoke({ data: { profileId } }),
    onSuccess: (res) => {
      if ("error" in res && res.error) return toast.error(res.error);
      toast.success("Access removed");
      setRemoveTarget(null);
      setDetails(null);
      void qc.invalidateQueries({ queryKey: ["staff-list"] });
      void qc.invalidateQueries({ queryKey: ["staff-audit"] });
    },
  });
  const roleMutation = useMutation({
    mutationFn: ({ profileId, role: nextRole }: { profileId: string; role: "online_sales" | "staff" | "manager" }) => changeRole({ data: { profileId, role: nextRole } }),
    onSuccess: (res) => {
      if ("error" in res && res.error) return toast.error(res.error);
      toast.success("Role updated");
      setDetails(null);
      void qc.invalidateQueries({ queryKey: ["staff-list"] });
      void qc.invalidateQueries({ queryKey: ["staff-audit"] });
    },
  });

  const changeStaffFilter = (next: () => void) => { next(); setPage(0); };
  const clearStaffFilters = () => { setSearch(""); setRoleFilter("all"); setSort("newest"); setPage(0); };
  const dismissPassword = () => { setTempPassword(null); setInviteOpen(false); };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <SectionHeading
          title="Staff access"
          subtitle={canManage ? "Manage who can open this panel" : "Only a Permanent admin can add or remove people"}
          as="h1"
          action={canManage ? (
            <Button type="button" onClick={() => { setTempPassword(null); setInviteOpen((open) => !open); }}>
              {inviteOpen ? <X /> : <Plus />}{inviteOpen ? "Close" : "Invite staff"}
            </Button>
          ) : undefined}
        />

        {canManage && inviteOpen && (
          <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]" aria-label="Invite staff">
            <div>
              <h2 className="font-display text-lg font-semibold">Invite staff</h2>
              <p className="text-sm text-muted-foreground">Give a Sales Manager, Staff, or Manager account immediate access.</p>
            </div>
            {tempPassword ? (
              <div className="rounded-lg border border-border bg-surface p-4 text-sm">
                <p><span aria-hidden="true">🔑 </span><strong>Temporary password:</strong> <code className="rounded bg-background px-1.5 py-0.5">{tempPassword}</code></p>
                <p className="mt-1 text-muted-foreground">Share this once; it won&apos;t be shown again after you close this.</p>
                <Button type="button" size="sm" className="mt-3" onClick={dismissPassword}>I&apos;ve saved it</Button>
              </div>
            ) : (
              <form className="grid gap-3 md:grid-cols-4" onSubmit={(event) => { event.preventDefault(); inviteMutation.mutate(); }}>
                <div className="space-y-1.5"><Label htmlFor="s-name">Name</Label><Input id="s-name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} required /></div>
                <div className="space-y-1.5"><Label htmlFor="s-email">Email</Label><Input id="s-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-role">Role</Label>
                  <Select value={role} onValueChange={(value) => setRole(value as (typeof INVITE_ROLES)[number])}>
                    <SelectTrigger id="s-role"><SelectValue /></SelectTrigger>
                    <SelectContent>{INVITE_ROLES.map((value) => <SelectItem key={value} value={value}>{ROLE_LABEL[value]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-end"><Button type="submit" className="w-full" disabled={inviteMutation.isPending || !email || name.trim().length < 2}>{inviteMutation.isPending ? "Giving access…" : "Give access"}</Button></div>
              </form>
            )}
          </section>
        )}

        <section className="space-y-3" aria-label="Staff members">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1 md:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Search staff" placeholder="Search staff by name or email" className="pl-9" value={search} onChange={(event) => changeStaffFilter(() => setSearch(event.target.value))} />
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <Select value={roleFilter} onValueChange={(value) => changeStaffFilter(() => setRoleFilter(value as "all" | StaffRoleName))}>
                <SelectTrigger className="w-44" aria-label="Filter by role"><SelectValue /></SelectTrigger>
                <SelectContent>{STAFF_ROLES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={sort} onValueChange={(value) => changeStaffFilter(() => setSort(value as typeof sort))}>
                <SelectTrigger className="w-40" aria-label="Sort staff"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="newest">Newest</SelectItem><SelectItem value="oldest">Oldest</SelectItem><SelectItem value="name">Name A–Z</SelectItem></SelectContent>
              </Select>
            </div>
            <Sheet>
              <SheetTrigger asChild><Button type="button" variant="outline" className="md:hidden"><Filter /> Filters</Button></SheetTrigger>
              <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
                <SheetHeader><SheetTitle>Staff filters</SheetTitle><SheetDescription>Filter the staff list by role and sort order.</SheetDescription></SheetHeader>
                <div className="grid gap-4 py-5">
                  <div className="space-y-1.5"><Label>Role</Label><Select value={roleFilter} onValueChange={(value) => changeStaffFilter(() => setRoleFilter(value as "all" | StaffRoleName))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STAFF_ROLES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1.5"><Label>Sort</Label><Select value={sort} onValueChange={(value) => changeStaffFilter(() => setSort(value as typeof sort))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Newest</SelectItem><SelectItem value="oldest">Oldest</SelectItem><SelectItem value="name">Name A–Z</SelectItem></SelectContent></Select></div>
                </div>
                <SheetFooter><SheetClose asChild><Button type="button">Show results</Button></SheetClose></SheetFooter>
              </SheetContent>
            </Sheet>
          </div>

          {staffQuery.isPending ? <LineSkeleton rows={4} /> : staffQuery.isError ? (
            <InlineError label="Unable to load staff members." onRetry={() => void staffQuery.refetch()} />
          ) : members.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
              <p>No staff found — try a different search or filter.</p><Button type="button" variant="outline" size="sm" className="mt-3" onClick={clearStaffFilters}>Clear filters</Button>
            </div>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] md:block">
                <table className="w-full text-sm">
                  <thead className="bg-surface text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Staff member</th><th className="p-3">Role</th><th className="p-3">Added</th><th className="w-16 p-3 text-right"><span className="sr-only">Actions</span></th></tr></thead>
                  <tbody>{members.map((member) => <StaffTableRow key={member.profileId} member={member} canManage={canManage} onDetails={setDetails} onRemove={setRemoveTarget} />)}</tbody>
                </table>
              </div>
              <div className="grid gap-2 md:hidden">{members.map((member) => <StaffMobileCard key={member.profileId} member={member} canManage={canManage} onDetails={setDetails} onRemove={setRemoveTarget} />)}</div>
            </>
          )}
          {!staffQuery.isPending && !staffQuery.isError && <ListPager page={page} total={total} busy={staffQuery.isFetching} onPage={setPage} />}
        </section>

        <Accordion type="single" collapsible value={auditOpen ? "activity" : ""} onValueChange={(value) => { setAuditOpen(value === "activity"); if (value !== "activity") setAuditPage(0); }}>
          <AccordionItem value="activity" className="rounded-2xl border border-border bg-card px-4 shadow-[var(--shadow-card)]">
            <AccordionTrigger className="hover:no-underline">
              <span><span className="block font-display text-base font-semibold">Recent changes</span><span className="mt-0.5 block text-xs font-normal text-muted-foreground">Every catalogue, price, stock and order update</span></span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 border-t border-border pt-4">
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_13rem_10rem]">
                <Input placeholder="Search activity" aria-label="Search activity" value={auditSearch} onChange={(event) => { setAuditSearch(event.target.value); setAuditPage(0); }} />
                <Select value={auditGroup} onValueChange={(value) => { setAuditGroup(value as AuditGroup); setAuditPage(0); }}><SelectTrigger aria-label="Event type"><SelectValue /></SelectTrigger><SelectContent>{AUDIT_GROUPS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
                <Select value={auditRange} onValueChange={(value) => { setAuditRange(value as AuditDateRange); setAuditPage(0); }}><SelectTrigger aria-label="Date range"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All dates</SelectItem><SelectItem value="7d">Last 7 days</SelectItem><SelectItem value="30d">Last 30 days</SelectItem><SelectItem value="90d">Last 90 days</SelectItem></SelectContent></Select>
              </div>
              {me?.signedIn && (me.role === "owner" || me.role === "super_admin") && <div className="flex justify-end"><ExportCsvButton dateRange onExport={(range) => exportAuditCsv({ data: { q: auditSearch, entityGroup: auditGroup, dateRange: auditRange, ...range } })} /></div>}
              {auditQuery.isPending ? <LineSkeleton rows={4} /> : auditQuery.isError ? <InlineError label="Unable to load recent changes." onRetry={() => void auditQuery.refetch()} /> : (auditQuery.data?.items.length ?? 0) === 0 ? <p className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-foreground">No activity matches these filters.</p> : <div className="divide-y divide-border">{(auditQuery.data?.items ?? []).map((item) => <AuditRow key={item.id} item={item} />)}</div>}
              {!auditQuery.isPending && !auditQuery.isError && <ListPager page={auditPage} total={auditQuery.data?.total ?? 0} busy={auditQuery.isFetching} onPage={setAuditPage} />}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <StaffDetailsSheet member={details} open={Boolean(details)} side={isMobile ? "bottom" : "right"} canManage={canManage} rolePending={roleMutation.isPending} onOpenChange={(open) => { if (!open) setDetails(null); }} onSaveRole={(member, nextRole) => roleMutation.mutate({ profileId: member.profileId, role: nextRole })} onRemove={setRemoveTarget} />
      <RemoveDialog member={removeTarget} pending={revokeMutation.isPending} onOpenChange={(open) => { if (!open) setRemoveTarget(null); }} onConfirm={() => removeTarget && revokeMutation.mutate(removeTarget.profileId)} />
    </TooltipProvider>
  );
}

function StaffActions({ member, canManage, onDetails, onRemove }: { member: StaffMember; canManage: boolean; onDetails: (member: StaffMember) => void; onRemove: (member: StaffMember) => void }) {
  const actionable = canManage && !member.isYou && !member.locked;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button type="button" size="icon" variant="ghost" aria-label={`Actions for ${member.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onDetails(member)}>View details</DropdownMenuItem>
        {actionable && <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onRemove(member)}><UserMinus />Remove access</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StaffTableRow(props: { member: StaffMember; canManage: boolean; onDetails: (member: StaffMember) => void; onRemove: (member: StaffMember) => void }) {
  const { member } = props;
  return <tr className="border-t border-border"><td className="p-3"><div className="flex items-center gap-3"><StaffAvatar member={member} /><div className="min-w-0"><p className="flex items-center gap-1.5 font-medium">{member.name}{member.isYou && <span className="text-xs font-normal text-muted-foreground">(you)</span>}{member.locked && <ProtectedLock />}</p><p className="truncate text-xs text-muted-foreground">{member.email}</p><ActiveIndicator /></div></div></td><td className="p-3"><RoleBadge role={member.role} /></td><td className="p-3 text-muted-foreground">{new Date(member.since).toLocaleDateString("en-IN")}</td><td className="p-3 text-right"><StaffActions {...props} /></td></tr>;
}

function StaffMobileCard(props: { member: StaffMember; canManage: boolean; onDetails: (member: StaffMember) => void; onRemove: (member: StaffMember) => void }) {
  const { member } = props;
  return <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-card)]"><StaffAvatar member={member} /><div className="min-w-0 flex-1"><p className="flex items-center gap-1.5 font-medium">{member.name}{member.isYou && <span className="text-xs font-normal text-muted-foreground">(you)</span>}{member.locked && <ProtectedLock />}</p><p className="truncate text-xs text-muted-foreground">{member.email}</p><div className="mt-2 flex flex-wrap items-center gap-2"><RoleBadge role={member.role} /><ActiveIndicator /><span className="text-xs text-muted-foreground">Added {new Date(member.since).toLocaleDateString("en-IN")}</span></div></div><StaffActions {...props} /></div>;
}

function ProtectedLock() {
  return <Tooltip><TooltipTrigger asChild><span className="inline-flex text-muted-foreground" tabIndex={0}><LockKeyhole className="size-3.5" /><span className="sr-only">Protected account</span></span></TooltipTrigger><TooltipContent>This account is protected and cannot be removed from this workspace.</TooltipContent></Tooltip>;
}

function StaffDetailsSheet({ member, open, side, canManage, rolePending, onOpenChange, onSaveRole, onRemove }: { member: StaffMember | null; open: boolean; side: "right" | "bottom"; canManage: boolean; rolePending: boolean; onOpenChange: (open: boolean) => void; onSaveRole: (member: StaffMember, role: "online_sales" | "staff" | "manager") => void; onRemove: (member: StaffMember) => void }) {
  const [selectedRole, setSelectedRole] = useState<"online_sales" | "staff" | "manager">("staff");
  useEffect(() => {
    if (member?.role === "online_sales" || member?.role === "staff" || member?.role === "manager") setSelectedRole(member.role);
  }, [member?.profileId, member?.role]);
  if (!member) return null;
  const actionable = canManage && !member.isYou && !member.locked;
  const canChangeRole = actionable && (member.role === "online_sales" || member.role === "staff" || member.role === "manager");
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side={side} className={side === "bottom" ? "h-[92vh] overflow-y-auto rounded-t-2xl" : "overflow-y-auto sm:max-w-md"}><SheetHeader><SheetTitle>Staff details</SheetTitle><SheetDescription>Access and permissions for this workspace.</SheetDescription></SheetHeader><div className="py-6"><div className="flex items-center gap-4"><StaffAvatar member={member} size="large" /><div className="min-w-0"><h2 className="flex items-center gap-2 font-display text-xl font-semibold">{member.name}{member.locked && <ProtectedLock />}</h2><p className="truncate text-sm text-muted-foreground">{member.email}</p><div className="mt-2 flex flex-wrap items-center gap-2"><RoleBadge role={member.role} /><ActiveIndicator />{member.isYou && <Badge variant="outline">You</Badge>}</div></div></div><dl className="mt-6 border-y border-border py-4 text-sm"><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Added</dt><dd>{new Date(member.since).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</dd></div></dl><div className="mt-6"><h3 className="font-semibold">Permissions</h3><div className="mt-3 grid gap-2">{(Object.keys(CAPABILITY_ROLE) as StaffCapability[]).map((capability) => { const allowed = roleAtLeast(member.role, CAPABILITY_ROLE[capability]); return <div key={capability} className="flex items-center justify-between gap-3 rounded-lg bg-surface px-3 py-2 text-sm"><span>{CAPABILITY_LABEL[capability]}</span><span className={`flex items-center gap-1 ${allowed ? "text-foreground" : "text-muted-foreground"}`}>{allowed ? <Check className="size-4" /> : <X className="size-4" />}{allowed ? "Allowed" : "Not allowed"}</span></div>; })}</div></div></div>{actionable && <SheetFooter className="block space-y-4 border-t border-border pt-4">{canChangeRole ? <div className="space-y-2"><Label htmlFor="staff-detail-role">Role</Label><Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as "online_sales" | "staff" | "manager")}><SelectTrigger id="staff-detail-role"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="online_sales">Sales Manager</SelectItem><SelectItem value="staff">Staff</SelectItem><SelectItem value="manager">Manager</SelectItem></SelectContent></Select><div className="flex flex-wrap items-center justify-between gap-2"><Button type="button" onClick={() => onSaveRole(member, selectedRole)} disabled={selectedRole === member.role || rolePending}>{rolePending ? "Saving…" : "Save"}</Button><Button type="button" variant="destructive" onClick={() => onRemove(member)}><UserMinus />Remove access</Button></div></div> : <Button type="button" variant="destructive" onClick={() => onRemove(member)}><UserMinus />Remove access</Button>}</SheetFooter>}</SheetContent></Sheet>;
}

function RemoveDialog({ member, pending, onOpenChange, onConfirm }: { member: StaffMember | null; pending: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void }) {
  return <AlertDialog open={Boolean(member)} onOpenChange={onOpenChange}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove access?</AlertDialogTitle><AlertDialogDescription>You are about to remove access for {member?.name} ({member?.email}). They will no longer be able to sign in to this workspace.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={pending} onClick={onConfirm}>Remove access</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}

function InlineError({ label, onRetry }: { label: string; onRetry: () => void }) {
  return <div className="rounded-xl border border-border bg-surface p-5 text-center text-sm"><p>{label}</p><Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>Try again</Button></div>;
}

function parseActor(actor: string) {
  const match = actor.match(/^(.*?)\s*<([^>]+)>\s*\(([^)]+)\)$/);
  if (!match) return { name: actor, email: "", role: "" };
  return { name: match[1]?.trim() || "Unknown", email: match[2] || "", role: match[3] || "" };
}

function actionTitle(action: string) {
  return action.split(".").map((part) => part.replaceAll("_", " ")).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" · ");
}

function auditIcon(action: string) {
  if (action === "staff.invited") return UserPlus;
  if (action === "staff.revoked") return UserMinus;
  if (action === "staff.owner_granted") return Crown;
  if (action.startsWith("staff.")) return Shield;
  if (/^(products|product_brands|categories|catalogue)\./.test(action)) return Package;
  if (action.startsWith("order.")) return ShoppingBag;
  if (action.startsWith("vendor.")) return Landmark;
  if (action.startsWith("trade.")) return Handshake;
  if (/^(vehicle|service)\./.test(action)) return Car;
  if (/^(about_photo|hero)\./.test(action)) return Image;
  if (action.startsWith("settings.")) return Settings;
  if (/^(review|enquiry|customer)\./.test(action)) return MessageSquare;
  if (action.startsWith("counter_sale.")) return Store;
  if (/^(booking|test_ride)\./.test(action)) return CalendarClock;
  return HandCoins;
}

function AuditRow({ item }: { item: AuditItem }) {
  const actor = parseActor(item.actor);
  const Icon = auditIcon(item.action);
  const role = actor.role ? ROLE_LABEL[actor.role as StaffRoleName] ?? actor.role.replaceAll("_", " ") : "";
  return <div className="flex gap-3 py-3"><span className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-surface text-muted-foreground"><Icon className="size-4" /></span><div className="min-w-0"><p className="font-medium">{actionTitle(item.action)}</p><p className="mt-0.5 text-xs text-muted-foreground"><span>{actor.email || actor.name}</span>{role && <span> · by {role}</span>}<span> · {new Date(item.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span></p></div></div>;
}
