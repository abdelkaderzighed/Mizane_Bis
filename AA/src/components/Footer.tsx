import React from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Separator } from './ui/separator';
import { 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  ExternalLink, 
  Sparkles,
  Heart,
  Shield,
  FileText,
  HelpCircle,
  Users,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '../utils/settings/supabaseClient';

interface FooterProps {
  className?: string;
}

export function Footer({ className = "" }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const [supportDialogOpen, setSupportDialogOpen] = React.useState(false);
  const [supportEmail, setSupportEmail] = React.useState('');
  const [supportSubject, setSupportSubject] = React.useState('');
  const [supportMessage, setSupportMessage] = React.useState('');
  const [supportCc, setSupportCc] = React.useState('');
  const [supportBcc, setSupportBcc] = React.useState('');
  const [isSubmittingSupport, setIsSubmittingSupport] = React.useState(false);
  const [supportError, setSupportError] = React.useState<string | null>(null);

  const handleSupportSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supportEmail.trim() || !supportSubject.trim() || !supportMessage.trim()) {
      toast.error('Merci de renseigner tous les champs du formulaire.');
      return;
    }

    setIsSubmittingSupport(true);
    setSupportError(null);

    const parseEmails = (value: string) => value.split(',').map(email => email.trim()).filter(Boolean);

    const payload = {
      email: supportEmail.trim(),
      subject: supportSubject.trim(),
      message: supportMessage.trim(),
      cc: parseEmails(supportCc),
      bcc: parseEmails(supportBcc)
    };

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Client Supabase non initialisé.');
      }

      const { error: supportInvokeError } = await supabase.functions.invoke('support-contact', {
        body: payload
      });
      if (supportInvokeError) {
        throw new Error(supportInvokeError.message || supportInvokeError.details || 'Erreur lors de l\'enregistrement du message.');
      }

      toast.success('Votre message a bien été envoyé à l\'équipe Mizane.');
      setSupportDialogOpen(false);
      setSupportSubject('');
      setSupportEmail('');
      setSupportMessage('');
      setSupportCc('');
      setSupportBcc('');
    } catch (error: any) {
      console.error('Support message error:', error);
      toast.error(error?.message || 'Impossible d\'envoyer le message.');
      setSupportError(error?.message || 'Impossible d\'envoyer le message.');
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  return (
    <footer className={`bg-muted/30 border-t border-border ${className}`}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* À propos de Mizane */}
          <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-lg">Mizane</h3>
              </div>
            <p className="text-sm text-muted-foreground">
              Gestionnaire et éditeur de documents intelligent alimenté par l'IA. 
              Créez, éditez et collaborez avec des agents IA spécialisés.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Heart className="w-4 h-4 text-red-500" />
              <span>Fait avec passion en Algérie</span>
            </div>
          </div>

          {/* Liens utiles */}
          <div className="space-y-4">
            <h4 className="font-semibold">Liens utiles</h4>
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-fit h-auto p-0 text-sm text-muted-foreground hover:text-foreground justify-start"
                onClick={() => setSupportDialogOpen(true)}
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Centre d'aide
              </Button>
              <Button variant="ghost" size="sm" className="w-fit h-auto p-0 text-sm text-muted-foreground hover:text-foreground justify-start">
                <Users className="w-4 h-4 mr-2" />
                Communauté
              </Button>
              <Button variant="ghost" size="sm" className="w-fit h-auto p-0 text-sm text-muted-foreground hover:text-foreground justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Documentation
              </Button>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold">Contact</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>contact-misan@parene.org</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>+213 563 83 96 27</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>Dz Dakaa Ilmy ; 82 lot GERIC, cité Zouaghi Ain El Bey 25000 Constantine Algérie</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="w-4 h-4" />
                <span>Lun-Ven 9h-18h</span>
              </div>
            </div>
          </div>

          {/* Légal */}
          <div className="space-y-4">
            <h4 className="font-semibold">Légal</h4>
            <div className="space-y-2">
              <Button variant="ghost" size="sm" className="w-fit h-auto p-0 text-sm text-muted-foreground hover:text-foreground justify-start">
                <Shield className="w-4 h-4 mr-2" />
                Confidentialité
              </Button>
              <Button variant="ghost" size="sm" className="w-fit h-auto p-0 text-sm text-muted-foreground hover:text-foreground justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Conditions d'utilisation
              </Button>
              <Button variant="ghost" size="sm" className="w-fit h-auto p-0 text-sm text-muted-foreground hover:text-foreground justify-start">
                <ExternalLink className="w-4 h-4 mr-2" />
                Mentions légales
              </Button>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>© {currentYear} Mizane. Tous droits réservés.</span>
            <Separator orientation="vertical" className="h-4" />
            <span>Version 1.0.0 Beta</span>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Alimenté par l'IA</span>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Service disponible</span>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Contacter l'équipe Mizane</DialogTitle>
            <DialogDescription>
              Renseignez les détails de votre demande. Votre message sera transmis directement à assistant-misan@parene.org (Mizane).
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSupportSubmit}>
            {supportError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/40 p-3 text-sm text-destructive">
                {supportError}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="support-subject">Sujet</Label>
              <Input
                id="support-subject"
                value={supportSubject}
                onChange={event => setSupportSubject(event.target.value)}
                placeholder="Sujet de votre demande"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="support-email">Votre email</Label>
              <Input
                id="support-email"
                type="email"
                value={supportEmail}
                onChange={event => setSupportEmail(event.target.value)}
                placeholder="exemple@domaine.com"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="support-cc">CC</Label>
              <Input
                id="support-cc"
                value={supportCc}
                onChange={event => setSupportCc(event.target.value)}
                placeholder="ex: mail1@example.com, mail2@example.com"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="support-bcc">BCC</Label>
              <Input
                id="support-bcc"
                value={supportBcc}
                onChange={event => setSupportBcc(event.target.value)}
                placeholder="ex: confidentialité@example.com"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="support-message">Message</Label>
              <Textarea
                id="support-message"
                value={supportMessage}
                onChange={event => setSupportMessage(event.target.value)}
                placeholder="Décrivez votre demande en 10 à 15 lignes..."
                rows={12}
                required
              />
              <p className="text-xs text-muted-foreground">
                Indiquez les informations clés (contexte, impact, captures éventuelles) pour faciliter l'assistance.
              </p>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setSupportDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmittingSupport}>
                {isSubmittingSupport ? 'Envoi en cours...' : 'Envoyer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </footer>
  );
}
