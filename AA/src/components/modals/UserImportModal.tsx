import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { AdminUser } from '../../types';
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  X,
  Info,
  Users,
  FileX
} from 'lucide-react';
import { toast } from 'sonner';

interface UserImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport?: (users: Partial<AdminUser>[]) => void;
}

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  warnings: string[];
}

export function UserImportModal({ open, onOpenChange, onImport }: UserImportModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modèle CSV avec les colonnes attendues
  const csvTemplate = `name,email,role,status,subscriptionType,subscriptionStart,subscriptionEnd,tokens
"Jean Dupont","jean.dupont@example.dz","user","active","pro","2024-01-01","2024-12-31","500000"
"Marie Martin","marie.martin@example.dz","collaborateur","inactive","premium","2024-02-01","2024-12-31","1000000"
"Ahmed Benali","ahmed.benali@example.dz","user","expired","premium","","","100000"`;

  const requiredFields = ['name', 'email'];
  const optionalFields = ['role', 'status', 'subscriptionType', 'subscriptionStart', 'subscriptionEnd', 'tokens'];
  const allowedRoles = ['user', 'collaborateur', 'admin'];
  const allowedStatuses = ['active', 'inactive', 'pending', 'expired'];
  const allowedSubscriptionTypes = ['admin', 'pro', 'premium'];

  const handleDownloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modele_import_utilisateurs.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Modèle CSV téléchargé');
  };

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(header => 
      header.replace(/^"(.*)"$/, '$1').trim()
    );

    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < lines[i].length; j++) {
        const char = lines[i][j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const row: any = {};
      headers.forEach((header, index) => {
        let value = values[index] || '';
        // Nettoyer les guillemets
        value = value.replace(/^"(.*)"$/, '$1');
        row[header] = value;
      });
      data.push(row);
    }

    return data;
  };

  const validateUser = (user: any, index: number): { isValid: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Vérifier les champs obligatoires
    requiredFields.forEach(field => {
      if (!user[field] || user[field].trim() === '') {
        errors.push(`Ligne ${index + 2}: Le champ '${field}' est obligatoire`);
      }
    });

    // Vérifier le format email
    if (user.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
      errors.push(`Ligne ${index + 2}: Format d'email invalide: ${user.email}`);
    }

    // Vérifier le rôle
    if (user.role && !allowedRoles.includes(user.role)) {
      errors.push(`Ligne ${index + 2}: Rôle invalide '${user.role}'. Valeurs autorisées: ${allowedRoles.join(', ')}`);
    }

    // Vérifier le statut
    if (user.status && !allowedStatuses.includes(user.status)) {
      errors.push(`Ligne ${index + 2}: Statut invalide '${user.status}'. Valeurs autorisées: ${allowedStatuses.join(', ')}`);
    }

    // Vérifier le type d'abonnement
    if (user.subscriptionType && !allowedSubscriptionTypes.includes(user.subscriptionType)) {
      errors.push(`Ligne ${index + 2}: Type d'abonnement invalide '${user.subscriptionType}'. Valeurs autorisées: ${allowedSubscriptionTypes.join(', ')}`);
    }

    // Vérifier les jetons
    if (user.tokens && isNaN(Number(user.tokens))) {
      errors.push(`Ligne ${index + 2}: Le nombre de jetons doit être un nombre: ${user.tokens}`);
    } else if (user.tokens && Number(user.tokens) < 0) {
      errors.push(`Ligne ${index + 2}: Le nombre de jetons ne peut pas être négatif: ${user.tokens}`);
    }

    // Vérifier les dates
    if (user.subscriptionStart && user.subscriptionStart !== '' && isNaN(Date.parse(user.subscriptionStart))) {
      errors.push(`Ligne ${index + 2}: Format de date invalide pour subscriptionStart: ${user.subscriptionStart}`);
    }

    if (user.subscriptionEnd && user.subscriptionEnd !== '' && isNaN(Date.parse(user.subscriptionEnd))) {
      errors.push(`Ligne ${index + 2}: Format de date invalide pour subscriptionEnd: ${user.subscriptionEnd}`);
    }

    // Avertissements pour les valeurs par défaut
    if (!user.role) {
      warnings.push(`Ligne ${index + 2}: Rôle non spécifié, 'user' sera utilisé par défaut`);
    }

    if (!user.status) {
      warnings.push(`Ligne ${index + 2}: Statut non spécifié, 'active' sera utilisé par défaut`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  const processCSV = async (csvText: string): Promise<ImportResult> => {
    const users = parseCSV(csvText);
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    const validUsers: Partial<AdminUser>[] = [];

    if (users.length === 0) {
      return {
        success: false,
        imported: 0,
        errors: ['Le fichier CSV est vide ou mal formaté'],
        warnings: []
      };
    }

    // Vérifier la présence des colonnes obligatoires
    const firstUser = users[0];
    const missingRequired = requiredFields.filter(field => !(field in firstUser));
    if (missingRequired.length > 0) {
      allErrors.push(`Colonnes obligatoires manquantes: ${missingRequired.join(', ')}`);
    }

    // Traiter chaque utilisateur
    users.forEach((user, index) => {
      const validation = validateUser(user, index);
      allErrors.push(...validation.errors);
      allWarnings.push(...validation.warnings);

      if (validation.isValid) {
        // Créer l'utilisateur avec les valeurs par défaut
        const processedUser: Partial<AdminUser> = {
          name: user.name?.trim(),
          email: user.email?.trim().toLowerCase(),
          role: user.role || 'user',
          status: user.status || 'active',
          subscriptionType: user.subscriptionType || 'free',
          subscriptionStart: user.subscriptionStart || '',
          subscriptionEnd: user.subscriptionEnd || '',
          tokens: user.tokens ? Number(user.tokens) : 0,
          // Générer un ID temporaire - sera remplacé lors de la sauvegarde
          id: `import_${Date.now()}_${index}`,
          avatar: '/api/placeholder/32/32',
          createdAt: new Date().toISOString().split('T')[0],
          lastLogin: new Date().toISOString().split('T')[0],
          totalOrders: 0,
          totalSpent: 0
        };

        validUsers.push(processedUser);
      }
    });

    return {
      success: allErrors.length === 0 && validUsers.length > 0,
      imported: validUsers.length,
      errors: allErrors,
      warnings: allWarnings
    };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Veuillez sélectionner un fichier CSV');
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);
    setImportResult(null);

    try {
      // Simuler le progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 100);

      const reader = new FileReader();
      reader.onload = async (e) => {
        const csvText = e.target?.result as string;
        
        try {
          const result = await processCSV(csvText);
          setUploadProgress(100);
          setImportResult(result);

          if (result.success && onImport) {
            // Ici on pourrait appeler onImport avec les utilisateurs validés
            // onImport(validUsers);
          }

        } catch (error) {
          console.error('Erreur traitement CSV:', error);
          setImportResult({
            success: false,
            imported: 0,
            errors: ['Erreur lors du traitement du fichier CSV'],
            warnings: []
          });
        } finally {
          clearInterval(progressInterval);
          setIsProcessing(false);
        }
      };

      reader.onerror = () => {
        setImportResult({
          success: false,
          imported: 0,
          errors: ['Erreur lors de la lecture du fichier'],
          warnings: []
        });
        setIsProcessing(false);
      };

      reader.readAsText(file, 'UTF-8');

    } catch (error) {
      console.error('Erreur upload:', error);
      toast.error('Erreur lors du traitement du fichier');
      setIsProcessing(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (importResult?.success && onImport) {
      // TODO: Implémenter la logique d'import réelle
      toast.success(`${importResult.imported} utilisateur(s) importé(s) avec succès`);
      setImportResult(null);
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setImportResult(null);
    setIsProcessing(false);
    setUploadProgress(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-600" />
            Import d'utilisateurs depuis CSV
          </DialogTitle>
          <DialogDescription>
            Importez plusieurs utilisateurs à partir d'un fichier CSV. Téléchargez d'abord le modèle pour voir le format attendu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instructions et modèle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="w-5 h-5 text-blue-600" />
                Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Champs obligatoires :</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {requiredFields.map(field => (
                      <li key={field} className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        <code className="bg-muted px-1 rounded">{field}</code>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Champs optionnels :</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {optionalFields.map(field => (
                      <li key={field} className="flex items-center gap-2">
                        <Info className="w-3 h-3 text-blue-600" />
                        <code className="bg-muted px-1 rounded">{field}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h5 className="font-medium mb-2">Rôles autorisés :</h5>
                  <div className="flex flex-wrap gap-1">
                    {allowedRoles.map(role => (
                      <Badge key={role} variant="outline" className="text-xs">{role}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h5 className="font-medium mb-2">Statuts autorisés :</h5>
                  <div className="flex flex-wrap gap-1">
                    {allowedStatuses.map(status => (
                      <Badge key={status} variant="outline" className="text-xs">{status}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h5 className="font-medium mb-2">Abonnements autorisés :</h5>
                  <div className="flex flex-wrap gap-1">
                    {allowedSubscriptionTypes.map(type => (
                      <Badge key={type} variant="outline" className="text-xs">{type}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  <strong>Important :</strong> Les dates doivent être au format YYYY-MM-DD. 
                  L'email et le mot de passe seront gérés séparément après l\'import.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Button onClick={handleDownloadTemplate} variant="outline" className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Télécharger le modèle CSV
            </Button>
            
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              className="flex-1"
              disabled={isProcessing}
            >
              <Upload className="w-4 h-4 mr-2" />
              {isProcessing ? 'Traitement...' : 'Sélectionner un fichier CSV'}
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Traitement en cours...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* Résultats */}
          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {importResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                  Résultat de l'analyse
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{importResult.imported}</div>
                    <div className="text-sm text-green-700">Utilisateurs valides</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{importResult.errors.length}</div>
                    <div className="text-sm text-red-700">Erreurs</div>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{importResult.warnings.length}</div>
                    <div className="text-sm text-yellow-700">Avertissements</div>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div>
                    <h5 className="font-medium text-red-600 mb-2 flex items-center gap-2">
                      <FileX className="w-4 h-4" />
                      Erreurs détectées :
                    </h5>
                    <ul className="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
                      {importResult.errors.map((error, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-red-500 mt-1">•</span>
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {importResult.warnings.length > 0 && (
                  <div>
                    <h5 className="font-medium text-yellow-600 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Avertissements :
                    </h5>
                    <ul className="text-sm text-yellow-700 space-y-1 max-h-32 overflow-y-auto">
                      {importResult.warnings.map((warning, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-yellow-500 mt-1">•</span>
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {importResult.success && (
                  <Alert>
                    <CheckCircle className="w-4 h-4" />
                    <AlertDescription>
                      Les données sont prêtes à être importées. Cliquez sur "Confirmer l'import" pour procéder.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions finales */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            Format de fichier supporté : CSV avec encodage UTF-8
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              <X className="w-4 h-4 mr-2" />
              Fermer
            </Button>
            
            {importResult?.success && (
              <Button onClick={handleConfirmImport}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirmer l'import ({importResult.imported} utilisateurs)
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
