import React from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Footer } from './Footer';
import { checkUserAccess } from '../utils/accessControl';
import exampleImage from 'figma:asset/62f6ba08acc1edb7f3b514d09860553db6f03b48.png';
import { 
  Scale, 
  FileText, 
  MessageSquare, 
  BookOpen, 
  Users, 
  Shield, 
  ChevronRight,
  CheckCircle,
  Star,
  Gavel,
  Building,
  Home,
  Briefcase,
  CreditCard,
  Calendar,
  ShoppingCart,
  Coins,
  ChevronDown,
  User,
  Key,
  Receipt,
  MapPin,
  Settings,
  Building2,
  Sparkles,
  Search,
  Target,
  Lightbulb,
  Zap,
  Globe,
  TrendingUp,
  Brain,
  RefreshCw
} from 'lucide-react';
import { UserInfo } from '../types';

interface HomePageProps {
  userInfo: UserInfo;
  isAuthenticated: boolean;
  cartLength: number;
  onProfileMenuClick: (action: string) => void;
  onStartChat: () => void;
  onStartFreeAccess: () => void;
  onNavigateToApp: () => void;
  onNavigateToPricing: () => void;
  onSetCartOpen: (open: boolean) => void;
  t: any;
}

// Configuration des fonctionnalités
const features = [
  {
    title: "Analyse Juridique Approfondie",
    description: "Analyse complète de documents juridiques avec identification des enjeux, risques et opportunités selon le droit algérien.",
    icon: Search,
    gradient: "from-blue-500 to-blue-600"
  },
  {
    title: "Recherche Documentaire Efficace", 
    description: "Recherche rapide dans la jurisprudence et la législation algérienne avec références précises et mises à jour.",
    icon: Target,
    gradient: "from-emerald-500 to-emerald-600"
  },
  {
    title: "Assistant Rédactionnel IA",
    description: "Aide à la rédaction de contrats, mémoires et actes juridiques conformes au droit algérien.",
    icon: Lightbulb,
    gradient: "from-purple-500 to-purple-600"
  },
  {
    title: "Optimisation Productivité",
    description: "Automatisation des tâches répétitives et gain de temps significatif dans votre pratique quotidienne.",
    icon: Zap,
    gradient: "from-orange-500 to-orange-600"
  }
];

// Configuration des secteurs juridiques
const legalSectors = [
  {
    title: "Droit Civil",
    description: "Contrats, responsabilité civile, droit de la famille, successions",
    icon: FileText,
    color: "text-blue-600"
  },
  {
    title: "Droit Commercial",
    description: "Sociétés commerciales, contrats commerciaux, droit de la concurrence",
    icon: Building,
    color: "text-emerald-600"
  },
  {
    title: "Droit du Travail",
    description: "Relations de travail, conventions collectives, conflits sociaux",
    icon: Users,
    color: "text-purple-600"
  },
  {
    title: "Droit Administratif",
    description: "Marchés publics, contentieux administratif, service public",
    icon: Building2,
    color: "text-orange-600"
  },
  {
    title: "Droit Pénal",
    description: "Procédure pénale, droit pénal des affaires, infractions",
    icon: Shield,
    color: "text-red-600"
  },
  {
    title: "Droit Immobilier",
    description: "Transactions immobilières, urbanisme, copropriété",
    icon: Home,
    color: "text-indigo-600"
  }
];

// Témoignages clients
const testimonials = [
  {
    name: "Maître Sarah Benali",
    role: "Avocate d'affaires, Alger",
    content: "Mizane a transformé ma pratique quotidienne. L'analyse de contrats est maintenant 3x plus rapide et précise.",
    avatar: "https://images.unsplash.com/photo-1559467397-1e9f8fe4f96a?w=150&h=150&fit=crop&crop=face"
  },
  {
    name: "Dr. Ahmed Khemis",
    role: "Juriste d'entreprise, Oran",
    content: "L'expertise en droit algérien de Mizane est impressionnante. C'est comme avoir un expert juridique disponible 24h/24.",
    avatar: "https://images.unsplash.com/photo-1550831107-1553da8c8464?w=150&h=150&fit=crop&crop=face"
  },
  {
    name: "Maître Farid Mansouri",
    role: "Cabinet d'avocats, Constantine",
    content: "Nos clients sont plus satisfaits grâce à la qualité et rapidité de nos analyses. Mizane est un véritable atout.",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face"
  }
];

// Questions du quiz juridique
const legalQuizQuestions = [
  {
    question: "Selon le Code civil algérien, à partir de quel âge une personne peut-elle contracter un mariage ?",
    options: ["16 ans", "18 ans", "19 ans pour les hommes, 18 ans pour les femmes", "21 ans"],
    correctAnswer: 2,
    explanation: "Selon l'article 7 du Code de la famille algérien, l'âge du mariage est fixé à 19 ans révolus pour l'homme et 18 ans révolus pour la femme."
  },
  {
    question: "Dans le droit commercial algérien, quel est le capital minimum requis pour créer une SARL ?",
    options: ["100 000 DA", "1 000 000 DA", "500 000 DA", "Aucun minimum"],
    correctAnswer: 0,
    explanation: "Le capital minimum pour une SARL en Algérie est de 100 000 DA selon le Code de commerce."
  },
  {
    question: "Quelle juridiction est compétente pour les litiges commerciaux en Algérie ?",
    options: ["Tribunal civil", "Tribunal de commerce", "Tribunal administratif", "Cour suprême"],
    correctAnswer: 1,
    explanation: "Les tribunaux de commerce sont compétents pour connaître des litiges entre commerçants relatifs à leurs activités commerciales."
  }
];

export function HomePage({
  userInfo,
  isAuthenticated,
  cartLength,
  onProfileMenuClick,
  onStartChat,
  onStartFreeAccess,
  onNavigateToApp,
  onNavigateToPricing,
  onSetCartOpen,
  t
}: HomePageProps) {
  // Vérifier l'accès utilisateur pour personnaliser l'affichage
  const userAccess = isAuthenticated ? checkUserAccess(userInfo) : null;

  // États pour le quiz interactif
  const [quizStarted, setQuizStarted] = React.useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [selectedAnswer, setSelectedAnswer] = React.useState<number | null>(null);
  const [showResult, setShowResult] = React.useState(false);
  
  const currentQuestion = legalQuizQuestions[currentQuestionIndex];
  
  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
    setShowResult(true);
    
    // Passer à la question suivante après 3 secondes
    setTimeout(() => {
      nextQuestion();
    }, 3000);
  };
  
  const nextQuestion = () => {
    setSelectedAnswer(null);
    setShowResult(false);
    setCurrentQuestionIndex(prev => (prev + 1) % legalQuizQuestions.length);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-50 to-slate-100 py-20 px-6">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Scale className="w-12 h-12 text-emerald-600" />
            <h1 className="text-4xl md:text-6xl font-bold text-slate-800">
              Assistant IA Juridique
            </h1>
          </div>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
            Dans un paysage juridique algérien en évolution rapide, naviguer parmi les textes législatifs et réglementaires peut s'avérer complexe. 
            Mizane est votre assistant virtuel intelligent, entièrement dédié au droit algérien, conçu pour révolutionner votre pratique professionnelle.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={onStartFreeAccess}
              disabled={isAuthenticated}
              className={`px-8 py-4 text-lg ${
                isAuthenticated 
                  ? "bg-gray-400 text-gray-600 cursor-not-allowed opacity-60" 
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
              title={isAuthenticated ? "Vous êtes déjà connecté - Utilisez le bouton 'Assistant IA' dans le header" : "Commencer votre essai gratuit"}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Commencer Gratuitement
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={onNavigateToPricing}
              className="px-8 py-4 text-lg bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Découvrir les tarifs
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          
          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Conformité droit algérien</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Disponible 24h/24</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Sécurité garantie</span>
            </div>
          </div>
        </div>
      </section>

      {/* Fonctionnalités principales */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">
              Fonctionnalités Avancées
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Des outils IA de pointe conçus spécifiquement pour optimiser votre pratique juridique
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className="p-6 h-full hover:shadow-lg transition-shadow border-0 bg-gradient-to-br from-white to-slate-50">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mb-4`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-2">{feature.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Secteurs du droit couverts */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">
              Expertise dans Tous les Secteurs du Droit
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Notre IA maîtrise l'ensemble du droit algérien avec une expertise approfondie dans chaque domaine
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {legalSectors.map((sector, index) => {
              const IconComponent = sector.icon;
              return (
                <Card key={index} className="p-6 hover:shadow-md transition-all duration-300 border-l-4 border-l-emerald-500">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center`}>
                      <IconComponent className={`w-5 h-5 ${sector.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 mb-2">{sector.title}</h3>
                      <p className="text-slate-600 text-sm">{sector.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section Quiz et Image - Nouvelle section humanisante */}
      <section className="py-20 px-6 bg-gradient-to-br from-emerald-50 to-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Image d'illustration */}
            <div className="order-2 lg:order-1">
              <div className="relative">
                <img 
                  src="https://images.unsplash.com/photo-1696453423411-3fc7847a9611?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBmZW1hbGUlMjBsYXd5ZXIlMjBvZmZpY2UlMjBtb2Rlcm4lMjB3b3Jrc3BhY2V8ZW58MXx8fHwxNzU1OTg1MTU3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" 
                  alt="Professionnel du droit utilisant Mizane"
                  className="w-full h-80 object-cover rounded-2xl shadow-lg"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/20 to-transparent rounded-2xl"></div>
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Scale className="w-5 h-5 text-emerald-600" />
                      <span className="font-medium text-slate-800">Mizane en Action</span>
                    </div>
                    <p className="text-sm text-slate-600">
                      Des milliers de professionnels utilisent Mizane quotidiennement pour optimiser leur expertise juridique
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quiz interactif */}
            <div className="order-1 lg:order-2">
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-emerald-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-lg flex items-center justify-center">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Quiz Droit Algérien</h3>
                    <p className="text-sm text-slate-600">Testez vos connaissances juridiques</p>
                  </div>
                </div>

                {!quizStarted ? (
                  <div className="text-center">
                    <p className="text-slate-600 mb-6">
                      Découvrez l'étendue de vos connaissances en droit algérien avec notre quiz interactif alimenté par l'IA.
                    </p>
                    <Button 
                      onClick={() => setQuizStarted(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      Commencer le Quiz
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <Badge variant="outline" className="text-emerald-600 border-emerald-600">
                          Question {currentQuestionIndex + 1} / {legalQuizQuestions.length}
                        </Badge>
                        <Button
                          onClick={nextQuestion}
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                      <h4 className="font-medium text-slate-800 mb-4 leading-relaxed">
                        {currentQuestion.question}
                      </h4>
                    </div>

                    <div className="space-y-3">
                      {currentQuestion.options.map((option, index) => {
                        let buttonClass = "w-full p-4 text-left rounded-lg border transition-all duration-200 hover:bg-slate-50";
                        
                        if (showResult) {
                          if (index === currentQuestion.correctAnswer) {
                            buttonClass += " bg-green-50 border-green-500 text-green-800";
                          } else if (selectedAnswer === index) {
                            buttonClass += " bg-red-50 border-red-500 text-red-800";
                          } else {
                            buttonClass += " bg-slate-50 border-slate-200 text-slate-500";
                          }
                        } else {
                          buttonClass += " border-slate-200 hover:border-emerald-300";
                        }

                        return (
                          <button
                            key={index}
                            onClick={() => handleAnswerSelect(index)}
                            disabled={showResult}
                            className={buttonClass}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium ${
                                showResult && index === currentQuestion.correctAnswer
                                  ? "bg-green-500 border-green-500 text-white"
                                  : showResult && selectedAnswer === index
                                  ? "bg-red-500 border-red-500 text-white"
                                  : "border-slate-300"
                              }`}>
                                {String.fromCharCode(65 + index)}
                              </div>
                              <span>{option}</span>
                              {showResult && index === currentQuestion.correctAnswer && (
                                <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {showResult && (
                      <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-slate-700">
                            <span className="font-medium">Explication :</span>
                            <br />
                            {currentQuestion.explanation}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-6 text-center">
                      <p className="text-xs text-slate-500">
                        Questions générées par l'IA • Nouvelle question automatique dans {showResult ? '3s' : '15s'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Témoignages */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">
              Ils nous font confiance
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Des professionnels du droit algérien utilisent déjà Mizane pour optimiser leur pratique
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6 h-full">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-600 mb-6 italic">"{testimonial.content}"</p>
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                    <AvatarFallback>
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-slate-800">{testimonial.name}</div>
                    <div className="text-sm text-slate-600">{testimonial.role}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Final */}
      <section className="py-20 px-6 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <Gavel className="w-16 h-16 mx-auto mb-6 opacity-90" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Prêt à transformer votre pratique du droit ?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Rejoignez les centaines de professionnels qui utilisent déjà Mizane pour révolutionner leur activité juridique
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={onStartFreeAccess}
              disabled={isAuthenticated && userAccess?.canAccessAI}
              className={isAuthenticated 
                ? (userAccess?.canAccessAI 
                  ? "bg-gray-400 text-gray-600 px-8 py-4 text-lg cursor-not-allowed opacity-60"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 text-lg")
                : "bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 text-lg"
              }
              title={isAuthenticated 
                ? (userAccess?.canAccessAI 
                  ? "Vous avez déjà accès à Mizane" 
                  : "Réactiver votre accès à Mizane")
                : "Commencer votre essai gratuit"
              }
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              {isAuthenticated 
                ? (userAccess?.canAccessAI ? "Déjà connecté" : "Réactiver l'accès")
                : "Commencer Gratuitement"
              }
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={onNavigateToPricing}
              className="px-8 py-4 text-lg border-white text-white hover:bg-white/10"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Découvrir les tarifs
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <div className="text-sm text-white space-y-2">
                <div className="flex items-center gap-2 justify-center mb-4">
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  <span className="font-semibold">Essai gratuit de 7 jours - Sans engagement</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-300 flex-shrink-0" />
                    <span>Accès complet à tous les agents IA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-300 flex-shrink-0" />
                    <span>100 000 jetons offerts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-300 flex-shrink-0" />
                    <span>Éditeur de documents avancé</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-300 flex-shrink-0" />
                    <span>Support client prioritaire</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-300 flex-shrink-0" />
                    <span>Aucune carte bancaire requise</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-300 flex-shrink-0" />
                    <span>Annulation en un clic</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
