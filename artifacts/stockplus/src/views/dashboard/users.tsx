import { useState, useEffect, useCallback } from "react"
import {
  Users,
  UserPlus,
  UserMinus,
  Mail,
  Shield,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { useBoutique } from "@/views/dashboard/layout"
import { getSupabaseClient } from "@/supabase/client"
import { invitationService } from "@/services/invitationService"
import { hasPermission, formatRole, getDefaultPermissions } from "@/lib/auth-helpers"
import { RoleGuard } from "@/components/auth/role-guard"
import { PermissionBadge } from "@/components/auth/permission-badge"
import type { Invitation, PermissionId, Permissions } from "@/types/supabase"

type UserRow = {
  uid: string
  email: string
  name: string
  role: string
  boutique_id: string
  permissions: Permissions | null
  status: string | null
  created_at: string
}

const ALL_PERMISSIONS: { id: PermissionId; label: string; description: string }[] = [
  { id: "canManageUsers", label: "Gérer les utilisateurs", description: "Inviter, modifier les rôles et permissions" },
  { id: "canDeleteSales", label: "Supprimer des ventes", description: "Annuler ou supprimer des transactions" },
  { id: "canManageFeatures", label: "Gérer les fonctionnalités", description: "Activer/désactiver les modules SaaS" },
  { id: "canViewReports", label: "Voir les rapports", description: "Accéder aux analyses et rapports" },
  { id: "canUseAdvancedIA", label: "IA avancée", description: "Utiliser les fonctionnalités IA avancées" },
  { id: "canExportData", label: "Exporter les données", description: "Exporter en CSV, PDF, etc." },
  { id: "canManageProducts", label: "Gérer les produits", description: "Ajouter, modifier, supprimer des produits" },
  { id: "canManageInventory", label: "Gérer l'inventaire", description: "Ajuster les stocks et mouvements" },
]

export default function UsersPage() {
  const { toast } = useToast()
  const { boutique, userProfile } = useBoutique()

  const [users, setUsers] = useState<UserRow[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("manager")
  const [isInviting, setIsInviting] = useState(false)

  const [expandedPermissions, setExpandedPermissions] = useState<Set<string>>(new Set())
  const [savingPermissions, setSavingPermissions] = useState<Set<string>>(new Set())
  const [savingRole, setSavingRole] = useState<string | null>(null)

  const isOwner = userProfile?.role === "owner" || userProfile?.role === "superadmin"
  const isSuperAdmin = userProfile?.role === "superadmin"

  const fetchData = useCallback(async () => {
    if (!boutique?.id) return
    const supabase = getSupabaseClient()

    try {
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("*")
        .eq("boutique_id", boutique.id)
        .order("created_at", { ascending: false })

      if (usersError) throw usersError
      setUsers(usersData || [])

      const invResponse = await invitationService.list(supabase, boutique.id)
      setInvitations(invResponse.data.filter((inv) => inv.status === "pending"))
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    } finally {
      setIsLoading(false)
    }
  }, [boutique?.id, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail || !boutique || !userProfile) return
    setIsInviting(true)

    const supabase = getSupabaseClient()
    try {
      await invitationService.create(supabase, boutique.id, inviteEmail, inviteRole, userProfile.uid || userProfile.id)
      toast({ title: "Invitation envoyée", description: `Un email a été envoyé à ${inviteEmail}.` })
      setIsInviteDialogOpen(false)
      setInviteEmail("")
      setInviteRole("manager")

      const invResponse = await invitationService.list(supabase, boutique.id)
      setInvitations(invResponse.data.filter((inv) => inv.status === "pending"))
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    } finally {
      setIsInviting(false)
    }
  }

  const handleRevoke = async (invitationId: string) => {
    const supabase = getSupabaseClient()
    try {
      await invitationService.revoke(supabase, invitationId)
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId))
      toast({ title: "Invitation révoquée" })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    }
  }

  const handleChangeRole = async (userUid: string, newRole: string) => {
    setSavingRole(userUid)
    const supabase = getSupabaseClient()
    try {
      const newPermissions = getDefaultPermissions(newRole)
      const { error } = await supabase
        .from("users")
        .update({ role: newRole, permissions: newPermissions, updated_at: new Date().toISOString() })
        .eq("uid", userUid)

      if (error) throw error

      setUsers((prev) =>
        prev.map((u) => (u.uid === userUid ? { ...u, role: newRole, permissions: newPermissions } : u))
      )
      toast({ title: "Rôle mis à jour", description: formatRole(newRole) })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    } finally {
      setSavingRole(null)
    }
  }

  const togglePermissionPanel = (uid: string) => {
    setExpandedPermissions((prev) => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid)
      else next.add(uid)
      return next
    })
  }

  const handleTogglePermission = async (userUid: string, permission: PermissionId, currentValue: boolean) => {
    setSavingPermissions((prev) => new Set(prev).add(userUid))

    const supabase = getSupabaseClient()
    const user = users.find((u) => u.uid === userUid)
    if (!user) return

    const updatedPermissions: Permissions = {
      ...(user.permissions || getDefaultPermissions(user.role)),
      [permission]: !currentValue,
    }

    try {
      const { error } = await supabase
        .from("users")
        .update({ permissions: updatedPermissions, updated_at: new Date().toISOString() })
        .eq("uid", userUid)

      if (error) throw error

      setUsers((prev) =>
        prev.map((u) => (u.uid === userUid ? { ...u, permissions: updatedPermissions } : u))
      )
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    } finally {
      setSavingPermissions((prev) => {
        const next = new Set(prev)
        next.delete(userUid)
        return next
      })
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-headline font-bold text-gray-900 tracking-tight">Équipe</h1>
          <p className="text-gray-500 font-medium text-lg">Gérez les accès et permissions de votre équipe.</p>
        </div>
            <RoleGuard userRole={userProfile?.role} roles={["superadmin", "owner"]}>
              <Button
                onClick={() => setIsInviteDialogOpen(true)}
                className="sena-gradient text-white border-none rounded-2xl shadow-lg shadow-orange-500/20 h-14 px-8 font-bold text-lg"
              >
                <UserPlus className="h-5 w-5 mr-3" />
                Inviter un Membre
              </Button>
            </RoleGuard>
      </div>

      {invitations.length > 0 && (
        <Card className="premium-card overflow-hidden">
          <CardHeader className="p-6 border-b border-gray-50 bg-orange-50/20">
            <CardTitle className="font-headline text-lg flex items-center gap-3">
              <Mail className="h-5 w-5 text-primary" />
              Invitations en attente ({invitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="border-gray-100 hover:bg-transparent">
                  <TableHead className="font-bold text-gray-600 px-8 h-14 uppercase text-[10px] tracking-widest">Email</TableHead>
                  <TableHead className="font-bold text-gray-600 h-14 uppercase text-[10px] tracking-widest">Rôle</TableHead>
                  <TableHead className="font-bold text-gray-600 h-14 uppercase text-[10px] tracking-widest">Date</TableHead>
                  <TableHead className="text-right font-bold text-gray-600 px-8 h-14 uppercase text-[10px] tracking-widest">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id} className="border-gray-50 hover:bg-orange-50/10 transition-colors">
                    <TableCell className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-orange-50 flex items-center justify-center">
                          <Mail className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-bold text-gray-900">{inv.invited_email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-white border-gray-200 text-gray-600 font-bold px-3 py-1">
                        {formatRole(inv.invited_role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-gray-400 font-medium">
                      {new Date(inv.created_at).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-right px-8">
                      <RoleGuard userRole={userProfile?.role} roles={["superadmin", "owner"]}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl hover:bg-red-50 hover:text-red-500"
                          onClick={() => handleRevoke(inv.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </RoleGuard>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="premium-card overflow-hidden">
        <CardHeader className="p-8 border-b border-gray-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <CardTitle className="font-headline text-2xl text-gray-900 flex items-center gap-3">
              <Users className="h-6 w-6 text-primary" />
              Membres de l'équipe ({users.length})
            </CardTitle>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Chercher un membre..."
                className="pl-12 h-12 rounded-xl border-gray-200 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="border-gray-100 hover:bg-transparent">
                  <TableHead className="font-bold text-gray-600 px-8 h-16 uppercase text-[10px] tracking-widest">Membre</TableHead>
                  <TableHead className="font-bold text-gray-600 h-16 uppercase text-[10px] tracking-widest">Rôle</TableHead>
                  <TableHead className="font-bold text-gray-600 h-16 uppercase text-[10px] tracking-widest">Statut</TableHead>
                  <TableHead className="font-bold text-gray-600 h-16 uppercase text-[10px] tracking-widest">Permissions</TableHead>
                  <TableHead className="text-right font-bold text-gray-600 pr-8 h-16 uppercase text-[10px] tracking-widest">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16 text-gray-400 font-medium">
                      Aucun membre trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((member) => {
                    const isExpanded = expandedPermissions.has(member.uid)
                    const memberPermissions = member.permissions || getDefaultPermissions(member.role)
                    const isSavingPerms = savingPermissions.has(member.uid)

                    return (
                      <>
                        <TableRow
                          key={member.uid}
                          className="border-gray-50 group hover:bg-orange-50/10 transition-colors"
                        >
                          <TableCell className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-11 w-11 border-2 border-white shadow-md">
                                <AvatarFallback className="bg-orange-50 text-primary font-bold text-sm">
                                  {(member.name || member.email || "?").charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold text-gray-900">{member.name || "Utilisateur"}</p>
                                <p className="text-xs text-gray-400 font-medium">{member.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {isOwner && member.uid !== userProfile?.uid && member.role !== "superadmin" ? (
                                <div className="flex items-center gap-1">
                                  <Select
                                    value={member.role}
                                    onValueChange={(val) => handleChangeRole(member.uid, val)}
                                    disabled={savingRole === member.uid}
                                  >
                                    <SelectTrigger className="h-9 rounded-xl border-gray-200 text-xs font-bold min-w-[100px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                      <SelectItem value="owner">Propriétaire</SelectItem>
                                      <SelectItem value="manager">Gérant</SelectItem>
                                      <SelectItem value="staff">Staff</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {savingRole === member.uid && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                                </div>
                              ) : (
                                <Badge variant="outline" className="bg-white border-gray-200 text-gray-600 font-bold px-3 py-1">
                                  {formatRole(member.role)}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`rounded-lg font-bold px-3 py-1 ${
                                member.status === "Actif" || member.status === "active" || !member.status
                                  ? "bg-green-50 text-green-600"
                                  : "bg-gray-50 text-gray-400"
                              }`}
                            >
                              {member.status === "Actif" || member.status === "active" || !member.status
                                ? "Actif"
                                : "Inactif"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1.5 max-w-[260px]">
                              {ALL_PERMISSIONS.slice(0, 3).map((perm) => (
                                <PermissionBadge
                                  key={perm.id}
                                  role={member.role}
                                  permissions={memberPermissions}
                                  permission={perm.id}
                                  label=""
                                />
                              ))}
                              {ALL_PERMISSIONS.length > 3 && (
                                <span className="text-[10px] text-gray-400 font-bold ml-1">
                                  +{ALL_PERMISSIONS.length - 3}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-8">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary"
                                onClick={() => togglePermissionPanel(member.uid)}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                              {isOwner && member.uid !== userProfile?.uid && member.role !== "superadmin" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 rounded-xl hover:bg-red-50 hover:text-red-500"
                                  onClick={async () => {
                                    if (!confirm(`Retirer ${member.name || member.email} de l'équipe ?`)) return
                                    const supabase = getSupabaseClient()
                                    try {
                                      const { error } = await supabase
                                        .from("users")
                                        .update({ boutique_id: null, role: "staff", updated_at: new Date().toISOString() })
                                        .eq("uid", member.uid)
                                      if (error) throw error
                                      setUsers((prev) => prev.filter((u) => u.uid !== member.uid))
                                      toast({ title: "Membre retiré", description: `${member.email} a été retiré de l'équipe.` })
                                    } catch (e: any) {
                                      toast({ variant: "destructive", title: "Erreur", description: e.message })
                                    }
                                  }}
                                >
                                  <UserMinus className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${member.uid}-perms`} className="bg-orange-50/20">
                            <TableCell colSpan={5} className="px-8 py-6">
                              <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                  <Shield className="h-5 w-5 text-primary" />
                                  <span className="font-headline font-bold text-gray-900">
                                    Permissions — {member.name || member.email}
                                  </span>
                                  {isSavingPerms && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                                  {isSavingPerms && <span className="text-xs text-primary font-medium">Sauvegarde...</span>}
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                  {ALL_PERMISSIONS.map((perm) => {
                                    const allowed = hasPermission(member.role, memberPermissions, perm.id)
                                    return (
                                      <div
                                        key={perm.id}
                                        className="flex items-center justify-between p-4 rounded-2xl border bg-white hover:border-primary/20 transition-colors"
                                      >
                                        <div className="space-y-0.5">
                                          <Label className="font-bold text-sm cursor-pointer">{perm.label}</Label>
                                          <p className="text-[10px] text-gray-400">{perm.description}</p>
                                        </div>
                                        <Switch
                                          checked={allowed}
                                          disabled={!isOwner || member.role === "superadmin" || isSavingPerms}
                                          onCheckedChange={() =>
                                            handleTogglePermission(member.uid, perm.id, allowed)
                                          }
                                        />
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="rounded-3xl p-8 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-3xl font-headline font-bold">Nouvelle Invitation</DialogTitle>
            <DialogDescription className="text-lg font-medium text-gray-500">
              Invitez un membre à rejoindre votre boutique.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label className="font-bold text-gray-700">Adresse Email</Label>
              <Input
                type="email"
                placeholder="email@exemple.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="h-14 rounded-2xl border-gray-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-gray-700">Rôle</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="h-14 rounded-2xl border-gray-200 font-bold">
                  <SelectValue placeholder="Choisir un rôle" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="manager" className="rounded-xl font-bold">Gérant</SelectItem>
                  <SelectItem value="staff" className="rounded-xl font-bold">Staff</SelectItem>
                  {isSuperAdmin && <SelectItem value="owner" className="rounded-xl font-bold">Propriétaire</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsInviteDialogOpen(false)}
                className="h-14 px-6 rounded-2xl font-bold"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isInviting}
                className="sena-gradient text-white h-14 px-8 rounded-2xl font-bold shadow-lg"
              >
                {isInviting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Envoyer l'invitation"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
