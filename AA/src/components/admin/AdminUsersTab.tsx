import React from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import {
  Search,
  Filter,
  Upload,
  RefreshCw,
  UserPlus,
  Users,
  Loader2,
  AlertTriangle,
  Coins,
  MoreHorizontal,
  Eye,
  Edit,
  UserX,
  UserCheck,
  Shield,
  Trash2,
  Mail,
} from './icons';
import type { AdminUser } from '../../types';

interface AdminUsersTabProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  usersFilter: string;
  onUsersFilterChange: (value: string) => void;
  onImport: () => void;
  onRefresh: () => void;
  onCreate: () => void;
  usersLoading: boolean;
  usersError: string | null;
  filteredUsers: AdminUser[];
  selectedUserIds: string[];
  onSelectAllUsers: (checked: boolean | 'indeterminate') => void;
  onSelectUser: (userId: string, checked: boolean) => void;
  onViewUser: (user: AdminUser) => void;
  onEditUser: (user: AdminUser) => void;
  onUserAction: (userId: string, action: string) => void;
  getStatusClass: (status: string) => string;
}

const USER_STATUS_LABELS: Record<AdminUser['status'], string> = {
  active: 'Actif',
  inactive: 'Inactif',
  expired: 'Expiré',
  suspended: 'Suspendu',
  pending: 'En attente'
};

export function AdminUsersTab({
  searchTerm,
  onSearchTermChange,
  usersFilter,
  onUsersFilterChange,
  onImport,
  onRefresh,
  onCreate,
  usersLoading,
  usersError,
  filteredUsers,
  selectedUserIds,
  onSelectAllUsers,
  onSelectUser,
  onViewUser,
  onEditUser,
  onUserAction,
  getStatusClass,
}: AdminUsersTabProps) {
  const allSelected = selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0;

  if (usersLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Chargement des utilisateurs...</span>
        </div>
      </Card>
    );
  }

  if (usersError) {
    return (
      <Card className="p-8">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-12 h-12 mx-auto text-red-500" />
          <div>
            <h3 className="font-medium text-red-600">Erreur de chargement</h3>
            <p className="text-sm text-muted-foreground">{usersError}</p>
          </div>
          <Button onClick={onRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher utilisateurs..."
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              className="pl-8 w-80"
            />
          </div>
          <Select value={usersFilter} onValueChange={onUsersFilterChange}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les utilisateurs</SelectItem>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="inactive">Inactifs</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="admin">Administrateurs</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onImport}>
            <Upload className="w-4 h-4 mr-2" />
            Importer
          </Button>
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button onClick={onCreate}>
            <UserPlus className="w-4 h-4 mr-2" />
            Nouvel utilisateur
          </Button>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <Card className="p-8">
          <div className="text-center space-y-4">
            <Users className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
            <div>
              <h3 className="font-medium">Aucun utilisateur trouvé</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm || usersFilter !== 'all'
                  ? 'Essayez de modifier vos critères de recherche.'
                  : 'Aucun utilisateur enregistré pour le moment.'}
              </p>
            </div>
            <Button onClick={onCreate}>
              <UserPlus className="w-4 h-4 mr-2" />
              Créer le premier utilisateur
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={onSelectAllUsers}
                  />
                </TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Abonnement</TableHead>
                <TableHead>Jetons</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const isSelected = selectedUserIds.includes(user.id);
                return (
                  <TableRow
                    key={user.id}
                    className={isSelected ? 'bg-blue-50 border-blue-200' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => onSelectUser(user.id, Boolean(checked))}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {user.name}
                            {user.role === 'admin' && (
                              <Badge className="text-xs bg-red-500">Admin</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${user.role === 'admin' ? 'bg-red-500 text-white' : 'bg-gray-500 text-white'}`}>
                        {user.role === 'admin' ? 'Admin' : 'Utilisateur'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs border ${getStatusClass(user.status)}`}>
                        {USER_STATUS_LABELS[user.status] ?? user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.subscriptionType === 'premium' ? 'default' : 'secondary'} className="text-xs">
                        {user.subscriptionType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Coins className="w-4 h-4 text-yellow-600" />
                        <span>{user.tokens.toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.createdAt}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onViewUser(user)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Voir détails
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEditUser(user)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onUserAction(user.id, 'email')}>
                            <Mail className="w-4 h-4 mr-2" />
                            Envoyer un email
                          </DropdownMenuItem>
                          {user.status === 'active' ? (
                            <DropdownMenuItem onClick={() => onUserAction(user.id, 'suspend')}>
                              <UserX className="w-4 h-4 mr-2" />
                              Suspendre
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => onUserAction(user.id, 'activate')}>
                              <UserCheck className="w-4 h-4 mr-2" />
                              Activer
                            </DropdownMenuItem>
                          )}
                          {user.role !== 'admin' && (
                            <DropdownMenuItem onClick={() => onUserAction(user.id, 'make_admin')}>
                              <Shield className="w-4 h-4 mr-2" />
                              Promouvoir admin
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => onUserAction(user.id, 'delete')}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
