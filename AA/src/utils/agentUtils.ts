import { AIAgentType, LLMType, LLMModel } from '../types';

export const generateAgentResponse = (
  userMessage: string, 
  agent: AIAgentType, 
  llms: LLMType[],
  llmModels: Record<LLMType, LLMModel>
): string => {
  const hasFileReference = /(?:\.txt|\.md|\.doc|\.pdf|\.json|[A-Za-z]:[\\\/]|\/[^\s]*\.[a-zA-Z0-9]+)/.test(userMessage);
  const hasUrlReference = /https?:\/\/[^\s]+/.test(userMessage);
  
  const llmNames = llms.map(llm => llmModels[llm].name).join(', ');
  const llmInfo = `\n\n---\n**🤖 Modèles utilisés :** ${llmNames}`;

  switch (agent) {
    case 'conversation':
      if (hasFileReference && hasUrlReference) {
        return `## 💬 Analyse conversationnelle\n\nJe remarque que vous mentionnez des **fichiers** et des **URLs** :\n\n"${userMessage}"\n\n### Discussion\n- Quel aspect vous intéresse le plus dans ces ressources ?\n- Souhaitez-vous que nous explorions leur contenu ensemble ?\n- Y a-t-il des questions spécifiques que vous aimeriez aborder ?\n\n**Outils disponibles :** 📎 fichiers, 🔗 URLs, 📥 chargement direct, 🎤 vocal${llmInfo}`;
      } else if (hasFileReference) {
        return `## 💬 Discussion sur vos fichiers\n\n"${userMessage}"\n\n**Conversation ouverte :**\n- Que souhaitez-vous faire avec ces fichiers ?\n- Avez-vous des questions sur leur contenu ?\n- Voulez-vous les analyser ou les modifier ?\n\n> 💡 **Astuce :** Utilisez 🎤 pour me parler de vos fichiers ou 📎 pour les référencer !${llmInfo}`;
      } else if (hasUrlReference) {
        return `## 💬 Parlons de ces liens\n\n"${userMessage}"\n\n**Questions pour approfondir :**\n- Qu'est-ce qui vous a attiré vers ces URLs ?\n- Cherchez-vous des informations particulières ?\n- Souhaitez-vous comparer des sources ?\n\n> 🔍 **Exploration :** Utilisez 🔗 pour organiser vos liens ou 📥 pour charger le contenu !${llmInfo}`;
      } else {
        return `## 💬 Bonjour ! Comment puis-je vous aider ?\n\nJe suis votre assistant conversationnel alimenté par **${llmNames}**. Nous pouvons discuter de :\n\n- **Vos projets** - Partagez vos idées et objectifs\n- **Vos questions** - N'hésitez pas à demander des explications\n- **Vos documents** - Je peux vous aider à organiser vos fichiers\n- **Tout sujet** - Je suis là pour converser !\n\n**Fonctionnalités :** 📎 fichiers • 🔗 liens • 📥 chargement • 🎤 vocal\n\n*Que souhaitez-vous aborder aujourd'hui ?*${llmInfo}`;
      }

    case 'writing':
      if (hasFileReference || hasUrlReference) {
        return `## ✍️ Assistant Rédaction - Sources détectées\n\n**Votre demande :** "${userMessage}"\n\n### Aide à la rédaction avec ${llmNames}\n- **Analyse des sources** - Je peux examiner vos références\n- **Structure du contenu** - Organisation logique de vos idées\n- **Style et ton** - Adaptation selon votre audience\n- **Révision** - Amélioration de la cohérence\n\n### Outils de rédaction\n- 📝 **Éditeur Markdown** - Formatage professionnel\n- 📋 **Modèles** - Structures prêtes à utiliser\n- ✨ **Amélioration** - Suggestions stylistiques\n\n*Quel type de document souhaitez-vous créer ?*${llmInfo}`;
      } else {
        return `## ✍️ Assistant Rédaction\n\nJe suis spécialisé dans l'aide à l'écriture avec **${llmNames}** ! Voici comment je peux vous assister :\n\n### 📝 Types de rédaction\n- **Articles** - Blog, presse, web\n- **Documents** - Rapports, présentations, guides\n- **Créatif** - Histoires, poèmes, scripts\n- **Professionnel** - Emails, lettres, propositions\n\n### 🛠️ Mes services\n- **Brainstorming** - Génération d'idées\n- **Structure** - Plan et organisation\n- **Rédaction** - Écriture collaborative\n- **Révision** - Correction et amélioration\n\n*Sur quoi travaillons-nous aujourd'hui ?*${llmInfo}`;
      }

    case 'correction':
      if (hasFileReference || hasUrlReference) {
        return `## ✅ Service de Correction - Analyse des sources\n\n**Votre demande :** "${userMessage}"\n\n### Types de correction avec ${llmNames}\n- **Orthographe** - Fautes de frappe et d'orthographe\n- **Grammaire** - Structure et conjugaison\n- **Syntaxe** - Ordre des mots et phrases\n- **Style** - Fluidité et clarté\n- **Cohérence** - Logique et transitions\n\n### 📋 Processus de correction\n1. **Chargement** - Importez vos documents\n2. **Analyse** - Détection automatique des erreurs\n3. **Suggestions** - Propositions d'amélioration\n4. **Révision** - Version corrigée finale\n\n*Chargez votre texte pour commencer la correction !*${llmInfo}`;
      } else {
        return `## ✅ Service de Correction\n\nJe suis votre correcteur professionnel alimenté par **${llmNames}** ! Voici mes spécialités :\n\n### 🔍 Types de correction\n- **Orthographe** - Zéro faute garantie\n- **Grammaire** - Respect des règles\n- **Style** - Amélioration de la fluidité\n- **Ponctuation** - Usage correct des signes\n- **Vocabulaire** - Précision et richesse\n\n### ⚡ Correction rapide\n\`\`\`\nCopiez votre texte ici ou utilisez les boutons :\n📎 Charger fichier • 🔗 URL • 📥 Import direct\n\`\`\`\n\n*Collez votre texte ou chargez un document pour correction immédiate !*${llmInfo}`;
      }

    case 'analysis':
      if (hasFileReference || hasUrlReference) {
        return `## 📊 Assistant Analyse - Sources identifiées\n\n**Votre demande :** "${userMessage}"\n\n### Types d'analyse avec ${llmNames}\n- **Contenu textuel** - Thèmes, sentiments, structure\n- **Données** - Statistiques, tendances, patterns\n- **Comparaison** - Analyse comparative de sources\n- **Synthèse** - Résumés et points clés\n\n### 🔬 Méthodes d'analyse\n- **Qualitative** - Interprétation du sens\n- **Quantitative** - Mesures et métriques\n- **Structurelle** - Organisation et hiérarchie\n- **Contextuelle** - Mise en perspective\n\n### 📈 Rapport d'analyse\n1. **Chargement** des sources\n2. **Traitement** automatisé\n3. **Visualisation** des résultats\n4. **Recommandations** actionables\n\n*Chargez vos documents pour une analyse complète !*${llmInfo}`;
      } else {
        return `## 📊 Assistant Analyse\n\nJe suis spécialisé dans l'analyse de contenu et de données avec **${llmNames}** !\n\n### 🔍 Capacités d'analyse\n- **Documents** - Structure, thèmes, qualité\n- **Textes** - Sentiment, complexité, style\n- **Données** - Tendances, corrélations, insights\n- **Comparaisons** - Analyse comparative multi-sources\n\n### 📋 Types de rapports\n- **Synthèse** - Points clés et résumé\n- **Détaillé** - Analyse approfondie\n- **Visuel** - Graphiques et tableaux\n- **Actionnable** - Recommandations pratiques\n\n### 💡 Exemples d'usage\n- Analyse de performance de contenu\n- Étude comparative de documents\n- Extraction d'insights de données\n\n*Que souhaitez-vous analyser aujourd'hui ?*${llmInfo}`;
      }

    case 'creative':
      if (hasFileReference || hasUrlReference) {
        return `## 🎨 Assistant Créatif - Inspiration des sources\n\n**Votre demande :** "${userMessage}"\n\n### 💡 Approche créative avec ${llmNames}\n- **Inspiration** - Transformation créative de vos sources\n- **Remix** - Nouvelles perspectives sur le contenu existant\n- **Fusion** - Combinaison originale d'idées\n- **Innovation** - Solutions créatives inattendues\n\n### 🎪 Types de création\n- **Narratif** - Histoires, scénarios, récits\n- **Visuel** - Concepts, descriptions, moodboards\n- **Conceptuel** - Idées, métaphores, analogies\n- **Interactif** - Expériences, jeux, défis\n\n### ✨ Processus créatif\n1. **Exploration** des sources\n2. **Brainstorming** libre\n3. **Développement** d'idées\n4. **Raffinement** créatif\n\n*Transformons vos sources en créations originales !*${llmInfo}`;
      } else {
        return `## 🎨 Assistant Créatif\n\nBienvenue dans l'espace de création alimenté par **${llmNames}** ! Je suis votre partenaire créatif :\n\n### 🌟 Domaines créatifs\n- **Écriture créative** - Fiction, poésie, scripts\n- **Brainstorming** - Génération d'idées innovantes\n- **Storytelling** - Narration captivante\n- **Concepts visuels** - Descriptions immersives\n- **Jeux de mots** - Humour et créativité linguistique\n\n### 🎭 Techniques créatives\n- **Association libre** - Connexions inattendues\n- **Métaphores** - Analogies créatives\n- **Remix** - Réinvention d'idées existantes\n- **Expérimentation** - Exploration de nouvelles formes\n\n### 🚀 Déclencheurs créatifs\n- Donnez-moi un thème, un mot, une émotion\n- Partagez une contrainte créative\n- Décrivez votre vision\n\n*Quelle aventure créative commençons-nous ?*${llmInfo}`;
      }

    case 'technical':
      if (hasFileReference || hasUrlReference) {
        return `## 🔧 Assistant Technique - Analyse des ressources\n\n**Votre demande :** "${userMessage}"\n\n### 💻 Support technique avec ${llmNames}\n- **Code** - Révision, optimisation, debugging\n- **Documentation** - Analyse technique de vos documents\n- **Architecture** - Évaluation de solutions techniques\n- **Troubleshooting** - Résolution de problèmes\n\n### 🛠️ Technologies supportées\n- **Langages** - Python, JavaScript, Java, C++, etc.\n- **Frameworks** - React, Vue, Angular, Django, etc.\n- **Bases de données** - SQL, NoSQL, optimisation\n- **DevOps** - CI/CD, déploiement, monitoring\n\n### 📋 Services techniques\n1. **Audit** - Évaluation de code/architecture\n2. **Optimisation** - Performance et bonnes pratiques\n3. **Documentation** - Guides techniques détaillés\n4. **Formation** - Explications pédagogiques\n\n*Chargez vos fichiers techniques pour une analyse approfondie !*${llmInfo}`;
      } else {
        return `## 🔧 Assistant Technique\n\nJe suis votre expert technique polyvalent alimenté par **${llmNames}** !\n\n### 💻 Domaines d'expertise\n- **Programmation** - Tous langages et frameworks\n- **Architecture** - Conception de systèmes\n- **Debugging** - Résolution de bugs complexes\n- **Optimisation** - Performance et scalabilité\n- **Sécurité** - Bonnes pratiques et audit\n\n### 🛠️ Services techniques\n- **Code Review** - Analyse et suggestions\n- **Pair Programming** - Développement collaboratif\n- **Documentation** - Rédaction technique claire\n- **Formation** - Explications pédagogiques\n- **Troubleshooting** - Diagnostic et solutions\n\n### ⚡ Formats supportés\n\`\`\`\n📋 Code snippets • 📁 Projets complets\n🔍 Logs d'erreur • 📊 Métriques de performance\n\`\`\`\n\n*Quel défi technique puis-je vous aider à résoudre ?*${llmInfo}`;
      }

    default:
      return `## 🤖 Assistant IA\n\nComment puis-je vous aider aujourd'hui avec **${llmNames}** ?`;
  }
};