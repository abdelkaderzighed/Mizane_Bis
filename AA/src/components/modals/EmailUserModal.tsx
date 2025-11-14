import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Mail,
  Send,
  X,
  Copy,
  Users,
  RefreshCw,
  Paperclip
} from 'lucide-react';
import { toast } from 'sonner';
import type { AdminUser, EmailTemplate } from '../../types';

interface EmailUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUsers: AdminUser[];
  templates: EmailTemplate[];
  isLoadingTemplates: boolean;
  onRefreshTemplates?: () => Promise<void> | void;
  onSendEmail: (emailData: EmailData) => Promise<boolean> | boolean;
}

export interface EmailData {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  content: string;
  signature: string;
  attachments: File[];
  templateId?: string;
  textContent?: string;
}

const DEFAULT_SIGNATURE = "L'équipe Misan vous remercie de votre confiance.";
const CUSTOM_TEMPLATE_VALUE = 'custom';

function createDefaultEmailData(): EmailData {
  return {
    to: [],
    cc: [],
    bcc: [],
    subject: '',
    content: '',
    signature: DEFAULT_SIGNATURE,
    attachments: [],
    templateId: undefined,
    textContent: ''
  };
}

const parseEmails = (value: string): string[] => {
  return value
    .split(',')
    .map(email => email.trim())
    .filter(email => email.length > 0);
};

export function EmailUserModal({
  open,
  onOpenChange,
  selectedUsers,
  templates,
  isLoadingTemplates,
  onRefreshTemplates,
  onSendEmail
}: EmailUserModalProps) {
  const [emailData, setEmailData] = useState<EmailData>(() => createDefaultEmailData());
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [ccInput, setCcInput] = useState('');
  const [bccInput, setBccInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [hasTemplateSelectionChanged, setHasTemplateSelectionChanged] = useState(false);

  const resetForm = useCallback(() => {
    setEmailData(createDefaultEmailData());
    setCcInput('');
    setBccInput('');
    setShowCc(false);
    setShowBcc(false);
    setHasTemplateSelectionChanged(false);
  }, []);

  const handleModalOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    if (selectedUsers.length > 0) {
      const userEmails = selectedUsers.map(user => user.email);
      setEmailData(prev => ({
        ...prev,
        to: userEmails
      }));
    } else {
      setEmailData(prev => ({
        ...prev,
        to: []
      }));
    }
  }, [selectedUsers, open]);

  const applyTemplate = useCallback((template: EmailTemplate, options?: { preserveExisting?: boolean }) => {
    const preserveExisting = options?.preserveExisting ?? false;
    const ccList = Array.isArray(template.cc) ? template.cc : [];
    const bccList = Array.isArray(template.bcc) ? template.bcc : [];
    const allowAttachments = Boolean(template.metadata?.allowAttachments);

    if (!allowAttachments && emailData.attachments.length > 0) {
      toast.info('Les pièces jointes ont été retirées car le template sélectionné ne les autorise pas.');
    }

    setShowCc(ccList.length > 0);
    setShowBcc(bccList.length > 0);
    setCcInput(ccList.join(', '));
    setBccInput(bccList.join(', '));

    setEmailData(prev => ({
      ...prev,
      templateId: template.id,
      subject: preserveExisting && prev.subject ? prev.subject : template.subject,
      content: preserveExisting && prev.content ? prev.content : template.body,
      signature: template.signature || prev.signature || DEFAULT_SIGNATURE,
      cc: ccList,
      bcc: bccList,
      attachments: allowAttachments ? prev.attachments : [],
      textContent: typeof template.metadata?.plainBody === 'string' ? template.metadata?.plainBody : prev.textContent
    }));
  }, [emailData.attachments]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (templates.length === 0 || emailData.templateId || hasTemplateSelectionChanged) {
      return;
    }

    const defaultTemplate = templates.find(template => template.metadata?.allowAttachments) ?? templates[0];
    if (defaultTemplate) {
      applyTemplate(defaultTemplate);
    }
  }, [open, templates, emailData.templateId, hasTemplateSelectionChanged, applyTemplate]);

  const selectedTemplate = useMemo(() => {
    if (!emailData.templateId) {
      return null;
    }
    return templates.find(template => template.id === emailData.templateId) ?? null;
  }, [templates, emailData.templateId]);

  const attachmentsAllowed = selectedTemplate ? Boolean(selectedTemplate.metadata?.allowAttachments) : true;

  const handleTemplateSelectionChange = (value: string) => {
    setHasTemplateSelectionChanged(true);

    if (value === CUSTOM_TEMPLATE_VALUE) {
      setEmailData(prev => ({ ...prev, templateId: undefined }));
      return;
    }

    const template = templates.find(item => item.id === value);
    if (template) {
      applyTemplate(template);
    }
  };

  const handleRefreshTemplatesClick = async () => {
    try {
      await onRefreshTemplates?.();
    } catch (error) {
      console.error('Erreur lors du rafraîchissement des templates email:', error);
      toast.error('Impossible de rafraîchir les templates.');
    }
  };

  const handleAttachmentsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const newFiles = Array.from(files);
    setEmailData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...newFiles]
    }));

    event.target.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setEmailData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, fileIndex) => fileIndex !== index)
    }));
  };

  const copyAllEmails = () => {
    const ccList = parseEmails(ccInput);
    const bccList = parseEmails(bccInput);
    const allEmails = [...emailData.to, ...ccList, ...bccList];

    if (allEmails.length === 0) {
      toast.error('Aucune adresse email à copier.');
      return;
    }

    void navigator.clipboard.writeText(allEmails.join(', '));
    toast.success(`${allEmails.length} adresse(s) copiée(s) dans le presse-papiers`);
  };

  const getEmailPreview = () => {
    const ccCount = parseEmails(ccInput).length;
    const bccCount = parseEmails(bccInput).length;
    const totalRecipients = emailData.to.length + ccCount + bccCount;
    return `${totalRecipients} destinataire(s)`;
  };

  const removeRecipient = (email: string) => {
    setEmailData(prev => ({
      ...prev,
      to: prev.to.filter(item => item !== email)
    }));
  };

  const handleSend = async () => {
    if (emailData.to.length === 0) {
      toast.error('Aucun destinataire sélectionné');
      return;
    }

    if (!emailData.subject.trim()) {
      toast.error('Le sujet est obligatoire');
      return;
    }

    if (!emailData.content.trim()) {
      toast.error('Le contenu du message est obligatoire');
      return;
    }

    if (!attachmentsAllowed && emailData.attachments.length > 0) {
      toast.error('Le template sélectionné n’autorise pas les pièces jointes.');
      return;
    }

    setIsSending(true);

    try {
      const ccList = parseEmails(ccInput);
      const bccList = parseEmails(bccInput);

      const finalEmailData: EmailData = {
        ...emailData,
        cc: ccList,
        bcc: bccList,
        attachments: attachmentsAllowed ? emailData.attachments : [],
        templateId: selectedTemplate?.id ?? undefined,
        textContent: emailData.textContent
      };

      const sendOk = await onSendEmail(finalEmailData);
      if (!sendOk) {
        return;
      }

      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email:", error);
      toast.error("L'envoi de l'email a échoué");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleModalOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Envoyer un email collectif
          </DialogTitle>
          <DialogDescription>
            Envoyez un email aux {selectedUsers.length} utilisateur(s) sélectionné(s)
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Destinataires ({emailData.to.length})
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyAllEmails}
                  className="h-7 px-2"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copier
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-gray-50 min-h-[60px] max-h-32 overflow-y-auto">
                {emailData.to.map((email, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1 px-2 py-1"
                  >
                    <span className="text-xs">{email}</span>
                    <button
                      type="button"
                      onClick={() => removeRecipient(email)}
                      className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {emailData.to.length === 0 && (
                  <span className="text-gray-500 text-sm">Aucun destinataire sélectionné</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Template</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={emailData.templateId ?? CUSTOM_TEMPLATE_VALUE}
                  onValueChange={handleTemplateSelectionChange}
                  disabled={isLoadingTemplates || templates.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingTemplates ? 'Chargement...' : 'Choisir un template'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CUSTOM_TEMPLATE_VALUE}>Sans template prédéfini</SelectItem>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleRefreshTemplatesClick}
                  disabled={isLoadingTemplates}
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingTemplates ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Les champs CC/BCC, objet, message et signature sont pré-remplis par le template sélectionné.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="cc-toggle"
                  checked={showCc}
                  onCheckedChange={setShowCc}
                />
                <Label htmlFor="cc-toggle" className="text-sm">CC</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="bcc-toggle"
                  checked={showBcc}
                  onCheckedChange={setShowBcc}
                />
                <Label htmlFor="bcc-toggle" className="text-sm">BCC</Label>
              </div>
            </div>

            {showCc && (
              <div className="space-y-2">
                <Label>CC (Copie conforme)</Label>
                <Input
                  value={ccInput}
                  onChange={(event) => setCcInput(event.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                />
                <p className="text-xs text-gray-500">Séparez plusieurs adresses par des virgules</p>
              </div>
            )}

            {showBcc && (
              <div className="space-y-2">
                <Label>BCC (Copie cachée)</Label>
                <Input
                  value={bccInput}
                  onChange={(event) => setBccInput(event.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                />
                <p className="text-xs text-gray-500">Séparez plusieurs adresses par des virgules</p>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="subject">Sujet *</Label>
              <Input
                id="subject"
                value={emailData.subject}
                onChange={(event) => setEmailData(prev => ({ ...prev, subject: event.target.value }))}
                placeholder="Objet de votre email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Message *</Label>
              <Textarea
                id="content"
                value={emailData.content}
                onChange={(event) => setEmailData(prev => ({ ...prev, content: event.target.value }))}
                placeholder="Rédigez votre message ici..."
                className="min-h-[120px]"
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="text-content">Version texte (fallback)</Label>
              <Textarea
                id="text-content"
                value={emailData.textContent ?? ''}
                onChange={(event) => setEmailData(prev => ({ ...prev, textContent: event.target.value }))}
                placeholder="Texte brut envoyé si la version HTML n'est pas disponible"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">Nous recommandons de garder une version courte sans balises HTML.</p>
            </div>

            <div className="space-y-2">
              <Label>Pièces jointes</Label>
              <Input
                type="file"
                multiple
                onChange={handleAttachmentsChange}
                disabled={!attachmentsAllowed || isSending}
              />
              {!attachmentsAllowed && (
                <p className="text-xs text-amber-600">Ce template ne permet pas d'ajouter de pièces jointes.</p>
              )}
              {emailData.attachments.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {emailData.attachments.map((file, index) => (
                    <Badge
                      key={`${file.name}-${index}`}
                      variant="outline"
                      className="flex items-center gap-1 px-2 py-1"
                    >
                      <Paperclip className="w-3 h-3" />
                      <span className="text-xs truncate max-w-[140px]" title={`${file.name} (${Math.round(file.size / 1024)} Ko)`}>
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(index)}
                        className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">Aucun fichier sélectionné</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signature">Signature</Label>
              <Textarea
                id="signature"
                value={emailData.signature}
                onChange={(event) => setEmailData(prev => ({ ...prev, signature: event.target.value }))}
                placeholder="Votre signature"
                rows={2}
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border">
              <h4 className="font-medium text-sm mb-2">Aperçu de l'email</h4>
              <div className="text-sm space-y-1">
                <div><strong>À :</strong> {getEmailPreview()}</div>
                {showCc && ccInput && (
                  <div><strong>CC :</strong> {parseEmails(ccInput).length} destinataire(s)</div>
                )}
                {showBcc && bccInput && (
                  <div><strong>BCC :</strong> {parseEmails(bccInput).length} destinataire(s)</div>
                )}
                <div><strong>Sujet :</strong> {emailData.subject || 'Aucun sujet'}</div>
                <div><strong>Template :</strong> {selectedTemplate ? selectedTemplate.name : 'Aucun'}</div>
                <div><strong>Contenu :</strong> {emailData.content ? `${emailData.content.substring(0, 100)}…` : 'Aucun contenu'}</div>
                {emailData.signature && (
                  <div><strong>Signature :</strong> {emailData.signature}</div>
                )}
                {emailData.attachments.length > 0 && (
                  <div><strong>Pièces jointes :</strong> {emailData.attachments.length}</div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Mail className="w-4 h-4" />
            <span>
              {getEmailPreview()}
              {emailData.attachments.length > 0 && ` • ${emailData.attachments.length} PJ`}
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleModalOpenChange(false)}
              disabled={isSending}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSend}
              disabled={
                isSending ||
                emailData.to.length === 0 ||
                !emailData.subject.trim() ||
                !emailData.content.trim()
              }
              className="flex items-center gap-2"
            >
              {isSending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Envoyer l'email
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
