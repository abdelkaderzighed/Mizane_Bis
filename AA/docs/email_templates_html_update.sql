-- Met à jour les templates email pour inclure une version HTML chartée et un fallback texte.
-- À exécuter sur l'instance Supabase cible (ex : https://aycqqlxjuczgewyuzrqb.supabase.co).

BEGIN;

-- Template : Inscription
UPDATE email_templates
SET body = $$<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{subject}}</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6fb;
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
      color: #0f172a;
    }
    a { color: #2563eb; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f4f6fb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6fb; padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:28px 32px; background-color:#0f172a; color:#ffffff;">
              <span style="text-transform:uppercase; letter-spacing:0.08em; font-size:12px; color:#93c5fd;">Misan</span>
              <h1 style="margin:12px 0 0; font-size:26px; line-height:1.2; font-weight:600; color:#ffffff;">Bienvenue sur Misan</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px; font-size:16px; line-height:1.6;">Bonjour {{user_name}},</p>
              <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#475569;">Merci pour votre inscription sur Misan. Nous avons bien reçu vos informations ({{user_email}}) et notre équipe validera votre accès dans les plus brefs délais.</p>
              <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#1f2937;">Vous recevrez un email de confirmation dès que votre compte sera activé. En attendant, vous pouvez consulter nos offres et fonctionnalités pour préparer votre arrivée.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background-color:#2563eb; border-radius:999px;">
                    <a href="https://misan.parene.org/tarifs" style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none;">Découvrir nos offres</a>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:0 0 24px;">
                <tr>
                  <td style="padding:18px 20px; border:1px solid #e2e8f0; border-radius:12px; background-color:#ffffff;">
                    <p style="margin:0; font-size:14px; font-weight:600; color:#0f172a;">Points clés</p>
                    <p style="margin:8px 0 0; font-size:14px; line-height:1.6; color:#475569;">• Statut du compte : en cours de validation<br />• Notifications : vous serez averti dès l'activation<br />• Support : support.misan@parene.org</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:#64748b;">Besoin d'assistance ? Contactez-nous sur <a href="mailto:support.misan@parene.org" style="color:#2563eb; text-decoration:none;">support.misan@parene.org</a>.</p>
              <p style="margin:0; font-size:14px; line-height:1.6; color:#0f172a;">Bien cordialement,<br />{{signature}}</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0f172a; padding:24px 32px; text-align:center; color:#cbd5f5;">
              <p style="margin:0 0 8px; font-size:12px; letter-spacing:0.06em; text-transform:uppercase;">Misan</p>
              <p style="margin:0; font-size:12px; line-height:1.6;">© 2024 Misan – Tous droits réservés.</p>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0; font-size:11px; color:#94a3b8;">Vous recevez cet email car votre adresse est enregistrée sur Misan.</p>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'plainBody', $$Bonjour {{user_name}},

Merci pour votre inscription sur Misan. Nous avons bien reçu vos informations ({{user_email}}) et notre équipe validera votre accès dans les plus brefs délais.

Vous recevrez un email de confirmation dès que votre compte sera activé. En attendant, vous pouvez consulter nos offres depuis la page tarifs.

Besoin d'aide ? Contactez-nous sur support.misan@parene.org.

Bien cordialement,
{{signature}}$$
    )
WHERE name = 'Inscription';

-- Template : Confirmation inscription
UPDATE email_templates
SET body = $$<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{subject}}</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6fb;
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
      color: #0f172a;
    }
    a { color: #2563eb; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f4f6fb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6fb; padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:28px 32px; background-color:#0f172a; color:#ffffff;">
              <span style="text-transform:uppercase; letter-spacing:0.08em; font-size:12px; color:#93c5fd;">Misan</span>
              <h1 style="margin:12px 0 0; font-size:26px; line-height:1.2; font-weight:600; color:#ffffff;">Votre compte est activé</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px; font-size:16px; line-height:1.6;">Bonjour {{user_name}},</p>
              <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#475569;">Votre inscription vient d'être validée par notre équipe.</p>
              <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#1f2937;">Vous disposez maintenant d'un accès complet à la plateforme. Découvrez vos espaces dédiés, vos ressources et les outils mis à votre disposition.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background-color:#2563eb; border-radius:999px;">
                    <a href="https://misan.parene.org/connexion" style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none;">Se connecter à Misan</a>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:0 0 24px;">
                <tr>
                  <td style="padding:18px 20px; border:1px solid #e2e8f0; border-radius:12px; background-color:#ffffff;">
                    <p style="margin:0; font-size:14px; font-weight:600; color:#0f172a;">Points clés</p>
                    <p style="margin:8px 0 0; font-size:14px; line-height:1.6; color:#475569;">• Accès : activé immédiatement<br />• Tableau de bord : rendez-vous dans votre espace personnel<br />• Support : support.misan@parene.org</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:#64748b;">Besoin d'assistance ? Contactez-nous sur <a href="mailto:support.misan@parene.org" style="color:#2563eb; text-decoration:none;">support.misan@parene.org</a>.</p>
              <p style="margin:0; font-size:14px; line-height:1.6; color:#0f172a;">Bonne utilisation !<br />{{signature}}</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0f172a; padding:24px 32px; text-align:center; color:#cbd5f5;">
              <p style="margin:0 0 8px; font-size:12px; letter-spacing:0.06em; text-transform:uppercase;">Misan</p>
              <p style="margin:0; font-size:12px; line-height:1.6;">© 2024 Misan – Tous droits réservés.</p>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0; font-size:11px; color:#94a3b8;">Vous recevez cet email car votre adresse est enregistrée sur Misan.</p>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'plainBody', $$Bonjour {{user_name}},

Votre inscription vient d'être validée par notre équipe.

Vous disposez maintenant d'un accès complet à la plateforme. Connectez-vous pour retrouver vos ressources et outils.

Besoin d'aide ? Contactez-nous sur support.misan@parene.org.

Bonne utilisation !
{{signature}}$$
    )
WHERE name = 'Confirmation inscription';

-- Template : Confirmation achat
UPDATE email_templates
SET body = $$<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{subject}}</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6fb;
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
      color: #0f172a;
    }
    a { color: #2563eb; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f4f6fb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6fb; padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:28px 32px; background-color:#0f172a; color:#ffffff;">
              <span style="text-transform:uppercase; letter-spacing:0.08em; font-size:12px; color:#93c5fd;">Misan</span>
              <h1 style="margin:12px 0 0; font-size:26px; line-height:1.2; font-weight:600; color:#ffffff;">Nous avons reçu votre commande</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px; font-size:16px; line-height:1.6;">Bonjour {{user_name}},</p>
              <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#475569;">Votre commande a bien été enregistrée.</p>
              <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#475569;">Pour finaliser le paiement par virement, merci de suivre les instructions indiquées dans votre espace client.</p>
              <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#1f2937;">Nous vous confirmerons la réception du règlement dans les plus brefs délais.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background-color:#2563eb; border-radius:999px;">
                    <a href="https://misan.parene.org/mon-compte" style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none;">Suivre ma commande</a>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:0 0 24px;">
                <tr>
                  <td style="padding:18px 20px; border:1px solid #e2e8f0; border-radius:12px; background-color:#ffffff;">
                    <p style="margin:0; font-size:14px; font-weight:600; color:#0f172a;">Points clés</p>
                    <p style="margin:8px 0 0; font-size:14px; line-height:1.6; color:#475569;">• Statut de la commande : en attente de paiement<br />• Mode de règlement : virement bancaire<br />• Accès espace client : https://misan.parene.org/mon-compte</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:#64748b;">Besoin d'assistance ? Contactez-nous sur <a href="mailto:support.misan@parene.org" style="color:#2563eb; text-decoration:none;">support.misan@parene.org</a>.</p>
              <p style="margin:0; font-size:14px; line-height:1.6; color:#0f172a;">Merci de votre confiance !<br />{{signature}}</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0f172a; padding:24px 32px; text-align:center; color:#cbd5f5;">
              <p style="margin:0 0 8px; font-size:12px; letter-spacing:0.06em; text-transform:uppercase;">Misan</p>
              <p style="margin:0; font-size:12px; line-height:1.6;">© 2024 Misan – Tous droits réservés.</p>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0; font-size:11px; color:#94a3b8;">Vous recevez cet email car votre adresse est enregistrée sur Misan.</p>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'plainBody', $$Bonjour {{user_name}},

Votre commande a bien été enregistrée.

Pour finaliser le paiement par virement, merci de suivre les instructions indiquées dans votre espace client.

Nous vous confirmerons la réception du règlement dans les plus brefs délais.

Besoin d'aide ? support.misan@parene.org.

Merci de votre confiance !
{{signature}}$$
    )
WHERE name = 'Confirmation achat';

-- Template : Confirmation paiement en ligne
UPDATE email_templates
SET body = $$<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{subject}}</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6fb;
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
      color: #0f172a;
    }
    a { color: #2563eb; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f4f6fb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6fb; padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:28px 32px; background-color:#0f172a; color:#ffffff;">
              <span style="text-transform:uppercase; letter-spacing:0.08em; font-size:12px; color:#93c5fd;">Misan</span>
              <h1 style="margin:12px 0 0; font-size:26px; line-height:1.2; font-weight:600; color:#ffffff;">Paiement confirmé</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px; font-size:16px; line-height:1.6;">Bonjour {{user_name}},</p>
              <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#475569;">Nous confirmons la réception de votre paiement.</p>
              <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#1f2937;">Votre abonnement ou votre pack de jetons est désormais actif. Vous pouvez reprendre immédiatement vos activités sur la plateforme.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background-color:#2563eb; border-radius:999px;">
                    <a href="https://misan.parene.org/mon-compte" style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none;">Accéder à mon espace client</a>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:0 0 24px;">
                <tr>
                  <td style="padding:18px 20px; border:1px solid #e2e8f0; border-radius:12px; background-color:#ffffff;">
                    <p style="margin:0; font-size:14px; font-weight:600; color:#0f172a;">Points clés</p>
                    <p style="margin:8px 0 0; font-size:14px; line-height:1.6; color:#475569;">• Paiement : validé<br />• Accès : actif immédiatement<br />• Historique : disponible dans votre espace client</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:#64748b;">Besoin d'assistance ? Contactez-nous sur <a href="mailto:support.misan@parene.org" style="color:#2563eb; text-decoration:none;">support.misan@parene.org</a>.</p>
              <p style="margin:0; font-size:14px; line-height:1.6; color:#0f172a;">Merci de votre confiance !<br />{{signature}}</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0f172a; padding:24px 32px; text-align:center; color:#cbd5f5;">
              <p style="margin:0 0 8px; font-size:12px; letter-spacing:0.06em; text-transform:uppercase;">Misan</p>
              <p style="margin:0; font-size:12px; line-height:1.6;">© 2024 Misan – Tous droits réservés.</p>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0; font-size:11px; color:#94a3b8;">Vous recevez cet email car votre adresse est enregistrée sur Misan.</p>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'plainBody', $$Bonjour {{user_name}},

Nous confirmons la réception de votre paiement.

Votre abonnement ou votre pack de jetons est désormais actif. Vous pouvez reprendre immédiatement vos activités sur la plateforme.

Merci de votre confiance !
{{signature}}$$
    )
WHERE name = 'Confirmation paiement en ligne';

-- Template : Réception virement
UPDATE email_templates
SET body = $$<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{subject}}</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6fb;
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
      color: #0f172a;
    }
    a { color: #2563eb; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f4f6fb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6fb; padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:28px 32px; background-color:#0f172a; color:#ffffff;">
              <span style="text-transform:uppercase; letter-spacing:0.08em; font-size:12px; color:#93c5fd;">Misan</span>
              <h1 style="margin:12px 0 0; font-size:26px; line-height:1.2; font-weight:600; color:#ffffff;">Virement reçu</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px; font-size:16px; line-height:1.6;">Bonjour {{user_name}},</p>
              <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#475569;">Nous vous informons que votre virement a bien été réceptionné.</p>
              <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#1f2937;">Votre accès est maintenant pleinement actif. Vous pouvez continuer à profiter de tous nos services.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background-color:#2563eb; border-radius:999px;">
                    <a href="https://misan.parene.org/mon-compte" style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none;">Accéder à mon espace</a>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:0 0 24px;">
                <tr>
                  <td style="padding:18px 20px; border:1px solid #e2e8f0; border-radius:12px; background-color:#ffffff;">
                    <p style="margin:0; font-size:14px; font-weight:600; color:#0f172a;">Points clés</p>
                    <p style="margin:8px 0 0; font-size:14px; line-height:1.6; color:#475569;">• Virement : reçu et validé<br />• Accès : pleinement actif<br />• Assistance : support.misan@parene.org</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:#64748b;">Besoin d'assistance ? Contactez-nous sur <a href="mailto:support.misan@parene.org" style="color:#2563eb; text-decoration:none;">support.misan@parene.org</a>.</p>
              <p style="margin:0; font-size:14px; line-height:1.6; color:#0f172a;">Merci pour votre paiement.<br />{{signature}}</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0f172a; padding:24px 32px; text-align:center; color:#cbd5f5;">
              <p style="margin:0 0 8px; font-size:12px; letter-spacing:0.06em; text-transform:uppercase;">Misan</p>
              <p style="margin:0; font-size:12px; line-height:1.6;">© 2024 Misan – Tous droits réservés.</p>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0; font-size:11px; color:#94a3b8;">Vous recevez cet email car votre adresse est enregistrée sur Misan.</p>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'plainBody', $$Bonjour {{user_name}},

Nous vous informons que votre virement a bien été réceptionné.

Votre accès est maintenant pleinement actif. Merci pour votre paiement.

Bien cordialement,
{{signature}}$$
    )
WHERE name = 'Réception virement';

-- Template : Avertissement suspension
UPDATE email_templates
SET body = $$<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{subject}}</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6fb;
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
      color: #0f172a;
    }
    a { color: #2563eb; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f4f6fb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6fb; padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:28px 32px; background-color:#991b1b; color:#ffffff;">
              <span style="text-transform:uppercase; letter-spacing:0.08em; font-size:12px; color:#fecaca;">Misan</span>
              <h1 style="margin:12px 0 0; font-size:26px; line-height:1.2; font-weight:600; color:#ffffff;">Important : action requise</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px; font-size:16px; line-height:1.6;">Bonjour {{user_name}},</p>
              <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#475569;">Nous constatons que votre compte présente un incident.</p>
              <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#1f2937;">Merci de régulariser votre situation afin d'éviter la suspension ou la suppression de votre accès. Contactez notre équipe si vous avez besoin d'assistance.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background-color:#2563eb; border-radius:999px;">
                    <a href="mailto:support.misan@parene.org" style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none;">Contacter le support</a>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:0 0 24px;">
                <tr>
                  <td style="padding:18px 20px; border:1px solid #fee2e2; border-radius:12px; background-color:#fef2f2;">
                    <p style="margin:0; font-size:14px; font-weight:600; color:#7f1d1d;">Points clés</p>
                    <p style="margin:8px 0 0; font-size:14px; line-height:1.6; color:#991b1b;">• Statut : incident en cours<br />• Délai : régularisation rapide nécessaire<br />• Assistance : support.misan@parene.org</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:#64748b;">Besoin d'assistance immédiate ? Contactez-nous sur <a href="mailto:support.misan@parene.org" style="color:#2563eb; text-decoration:none;">support.misan@parene.org</a>.</p>
              <p style="margin:0; font-size:14px; line-height:1.6; color:#0f172a;">Merci de votre réactivité,<br />{{signature}}</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0f172a; padding:24px 32px; text-align:center; color:#cbd5f5;">
              <p style="margin:0 0 8px; font-size:12px; letter-spacing:0.06em; text-transform:uppercase;">Misan</p>
              <p style="margin:0; font-size:12px; line-height:1.6;">© 2024 Misan – Tous droits réservés.</p>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0; font-size:11px; color:#94a3b8;">Vous recevez cet email car votre adresse est enregistrée sur Misan.</p>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'plainBody', $$Bonjour {{user_name}},

Nous constatons que votre compte présente un incident.

Merci de régulariser votre situation afin d'éviter la suspension ou la suppression de votre accès. Contactez notre équipe à support.misan@parene.org si vous avez besoin d'assistance.

Merci de votre réactivité,
{{signature}}$$
    )
WHERE name = 'Avertissement suspension';

-- Template : Confirmation suppression compte
UPDATE email_templates
SET body = $$<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{subject}}</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6fb;
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
      color: #0f172a;
    }
    a { color: #2563eb; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f4f6fb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6fb; padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:28px 32px; background-color:#0f172a; color:#ffffff;">
              <span style="text-transform:uppercase; letter-spacing:0.08em; font-size:12px; color:#cbd5f5;">Misan</span>
              <h1 style="margin:12px 0 0; font-size:26px; line-height:1.2; font-weight:600; color:#ffffff;">Suppression de votre compte</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px; font-size:16px; line-height:1.6;">Bonjour {{user_name}},</p>
              <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#475569;">Nous vous confirmons que votre compte Misan a été supprimé.</p>
              <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#1f2937;">Vous n'avez plus accès à la plateforme. Si vous pensez qu'il s'agit d'une erreur ou souhaitez rouvrir un compte, contactez-nous.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background-color:#2563eb; border-radius:999px;">
                    <a href="mailto:support.misan@parene.org" style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none;">Contacter le support</a>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:0 0 24px;">
                <tr>
                  <td style="padding:18px 20px; border:1px solid #e2e8f0; border-radius:12px; background-color:#ffffff;">
                    <p style="margin:0; font-size:14px; font-weight:600; color:#0f172a;">Informations</p>
                    <p style="margin:8px 0 0; font-size:14px; line-height:1.6; color:#475569;">• Statut : compte fermé<br />• Accès : non disponible<br />• Support : support.misan@parene.org</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:#64748b;">Besoin d'assistance ? Contactez-nous sur <a href="mailto:support.misan@parene.org" style="color:#2563eb; text-decoration:none;">support.misan@parene.org</a>.</p>
              <p style="margin:0; font-size:14px; line-height:1.6; color:#0f172a;">Merci d'avoir utilisé nos services.<br />{{signature}}</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0f172a; padding:24px 32px; text-align:center; color:#cbd5f5;">
              <p style="margin:0 0 8px; font-size:12px; letter-spacing:0.06em; text-transform:uppercase;">Misan</p>
              <p style="margin:0; font-size:12px; line-height:1.6;">© 2024 Misan – Tous droits réservés.</p>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0; font-size:11px; color:#94a3b8;">Vous recevez cet email car votre adresse est enregistrée sur Misan.</p>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'plainBody', $$Bonjour {{user_name}},

Nous vous confirmons que votre compte Misan a été supprimé et que vous n'avez plus accès à la plateforme.

Si vous pensez qu'il s'agit d'une erreur ou souhaitez rouvrir un compte, contactez-nous à support.misan@parene.org.

Merci d'avoir utilisé nos services.
{{signature}}$$
    )
WHERE name = 'Confirmation suppression compte';

-- Template : Relance paiement
UPDATE email_templates
SET body = $$<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{subject}}</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6fb;
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
      color: #0f172a;
    }
    a { color: #2563eb; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f4f6fb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6fb; padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:28px 32px; background-color:#b45309; color:#ffffff;">
              <span style="text-transform:uppercase; letter-spacing:0.08em; font-size:12px; color:#fef3c7;">Misan</span>
              <h1 style="margin:12px 0 0; font-size:26px; line-height:1.2; font-weight:600; color:#ffffff;">Relance paiement en attente</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px; font-size:16px; line-height:1.6;">Bonjour {{user_name}},</p>
              <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#475569;">Nous revenons vers vous concernant le paiement de votre commande toujours en attente.</p>
              <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#1f2937;">Sans règlement sous 48h, nous serons contraints de suspendre l'accès au service. Merci de votre rapidité.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background-color:#2563eb; border-radius:999px;">
                    <a href="https://misan.parene.org/mon-compte" style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none;">Régulariser mon paiement</a>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:0 0 24px;">
                <tr>
                  <td style="padding:18px 20px; border:1px solid #fef3c7; border-radius:12px; background-color:#fffbeb;">
                    <p style="margin:0; font-size:14px; font-weight:600; color:#713f12;">Points clés</p>
                    <p style="margin:8px 0 0; font-size:14px; line-height:1.6; color:#854d0e;">• Paiement : en attente<br />• Délai : 48h pour régulariser<br />• Suspension : accès bloqué en cas de retard</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:#64748b;">Besoin d'assistance ? Contactez-nous sur <a href="mailto:support.misan@parene.org" style="color:#2563eb; text-decoration:none;">support.misan@parene.org</a>.</p>
              <p style="margin:0; font-size:14px; line-height:1.6; color:#0f172a;">Merci de votre réactivité,<br />{{signature}}</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0f172a; padding:24px 32px; text-align:center; color:#cbd5f5;">
              <p style="margin:0 0 8px; font-size:12px; letter-spacing:0.06em; text-transform:uppercase;">Misan</p>
              <p style="margin:0; font-size:12px; line-height:1.6;">© 2024 Misan – Tous droits réservés.</p>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0; font-size:11px; color:#94a3b8;">Vous recevez cet email car votre adresse est enregistrée sur Misan.</p>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'plainBody', $$Bonjour {{user_name}},

Nous revenons vers vous concernant le paiement de votre commande toujours en attente.

Sans règlement sous 48h, nous serons contraints de suspendre l'accès au service. Merci de votre rapidité.

Besoin d'aide ? support.misan@parene.org.

Merci de votre réactivité,
{{signature}}$$
    )
WHERE name = 'Relance paiement';

-- Template : Modèle d'email partagé
UPDATE email_templates
SET body = $$<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{subject}}</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6fb;
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
      color: #0f172a;
    }
    a {
      color: #2563eb;
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f4f6fb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6fb; padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:28px 32px; background-color:#0f172a; color:#ffffff;">
              <span style="text-transform:uppercase; letter-spacing:0.08em; font-size:12px; color:#93c5fd;">Misan</span>
              <h1 style="margin:12px 0 0; font-size:26px; line-height:1.2; font-weight:600; color:#ffffff;">{{headline}}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px; font-size:16px; line-height:1.6;">Bonjour {{user_name}},</p>
              <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#475569;">{{intro}}</p>
              <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#1f2937;">{{body_text}}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background-color:#2563eb; border-radius:999px;">
                    <a href="{{cta_url}}" style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none;">{{cta_label}}</a>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:0 0 24px;">
                <tr>
                  <td style="padding:18px 20px; border:1px solid #e2e8f0; border-radius:12px; background-color:#ffffff;">
                    <p style="margin:0; font-size:14px; font-weight:600; color:#0f172a;">Points clés</p>
                    <p style="margin:8px 0 0; font-size:14px; line-height:1.6; color:#475569;">{{summary}}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:#64748b;">Besoin d'assistance ? Contactez-nous sur <a href="mailto:support.misan@parene.org" style="color:#2563eb; text-decoration:none;">support.misan@parene.org</a>.</p>
              <p style="margin:0; font-size:14px; line-height:1.6; color:#0f172a;">Bien cordialement,<br />{{signature}}</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0f172a; padding:24px 32px; text-align:center; color:#cbd5f5;">
              <p style="margin:0 0 8px; font-size:12px; letter-spacing:0.06em; text-transform:uppercase;">Misan</p>
              <p style="margin:0; font-size:12px; line-height:1.6;">{{footer_links}}</p>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0; font-size:11px; color:#94a3b8;">Vous recevez cet email car votre adresse est enregistrée sur Misan.</p>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'description', 'Template HTML stylisé servant de base à dupliquer pour les communications Misan',
      'category', 'layout',
      'placeholders', jsonb_build_array('headline', 'intro', 'body_text', 'cta_label', 'cta_url', 'summary', 'footer_links', 'signature')
    )
WHERE name = 'modèle-de-sortie-email';

-- Template : Message utilisateur libre (autorise PJ)
UPDATE email_templates
SET body = $$<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{subject}}</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6fb;
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
      color: #0f172a;
    }
    a { color: #2563eb; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f4f6fb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6fb; padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:28px 32px; background-color:#0f172a; color:#ffffff;">
              <span style="text-transform:uppercase; letter-spacing:0.08em; font-size:12px; color:#93c5fd;">Misan</span>
              <h1 style="margin:12px 0 0; font-size:26px; line-height:1.2; font-weight:600; color:#ffffff;">{{headline}}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px; font-size:16px; line-height:1.6;">Bonjour {{user_name}},</p>
              <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#475569;">{{intro}}</p>
              <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#1f2937;">{{message_contenu}}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background-color:#2563eb; border-radius:999px;">
                    <a href="{{cta_url}}" style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none;">{{cta_label}}</a>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:0 0 24px;">
                <tr>
                  <td style="padding:18px 20px; border:1px solid #e2e8f0; border-radius:12px; background-color:#ffffff;">
                    <p style="margin:0; font-size:14px; font-weight:600; color:#0f172a;">Informations complémentaires</p>
                    <p style="margin:8px 0 0; font-size:14px; line-height:1.6; color:#475569;">{{summary}}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:#64748b;">Besoin d'assistance ? Contactez-nous sur <a href="mailto:support.misan@parene.org" style="color:#2563eb; text-decoration:none;">support.misan@parene.org</a>.</p>
              <p style="margin:0; font-size:14px; line-height:1.6; color:#0f172a;">Bien cordialement,<br />{{signature}}</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0f172a; padding:24px 32px; text-align:center; color:#cbd5f5;">
              <p style="margin:0 0 8px; font-size:12px; letter-spacing:0.06em; text-transform:uppercase;">Misan</p>
              <p style="margin:0; font-size:12px; line-height:1.6;">{{footer_links}}</p>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0; font-size:11px; color:#94a3b8;">Vous recevez cet email car votre adresse est enregistrée sur Misan.</p>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'plainBody', $$Bonjour {{user_name}},

{{message_contenu}}

{{signature}}$$
    )
WHERE name = 'message-utilisateur-libre';

COMMIT;
