import React from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Footer } from './Footer';
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
  Sparkles
} from 'lucide-react';
import { UserInfo } from '../types';

interface HomePageProps {
  userInfo: UserInfo;
  cartLength: number;
  onProfileMenuClick: (action: string) => void;
  onStartChat: () => void;
  onNavigateToApp: () => void;
  onNavigateToPricing: () => void;
  onSetCartOpen: (open: boolean) => void;
  t: any;
}

export function HomePage({
  userInfo,
  cartLength,
  onProfileMenuClick,
  onStartChat,
  onNavigateToApp,
  onNavigateToPricing,
  onSetCartOpen,
  t
}: HomePageProps) {
  const legalSectors = [
    {
      title: "Droit des Affaires",
      description: "Contrats commerciaux, sociétés, fusions-acquisitions",
      icon: Briefcase,
      color: "text-blue-600"
    },
    {
      title: "Droit Civil",
      description: "Obligations, biens, famille, successions",
      icon: Home,
      color: "text-green-600"
    },
    {
      title: "Droit Pénal",
      description: "Procédures pénales, défense, infractions",
      icon: Shield,
      color: "text-red-600"
    },
    {
      title: "Droit Administratif",
      description: "Contentieux administratif, marchés publics",
      icon: Building,
      color: "text-purple-600"
    },
    {
      title: "Droit du Travail",
      description: "Relations employeur-employé, conventions collectives",
      icon: Users,
      color: "text-orange-600"
    },
    {
      title: "Droit Immobilier",
      description: "Transactions immobilières, urbanisme, copropriété",
      icon: Building2,
      color: "text-indigo-600"
    }
  ];

  const features = [
    {
      title: "Rédaction Intelligente",
      description: "Génération automatique de contrats, actes et documents juridiques conformes au droit algérien",
      icon: FileText,
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      title: "Consultation IA",
      description: "Assistant juridique disponible 24h/24 pour répondre à vos questions juridiques complexes",
      icon: MessageSquare,
      gradient: "from-green-500 to-emerald-500"
    },
    {
      title: "Base Juridique",
      description: "Accès à une base de données complète du droit algérien mise à jour régulièrement",
      icon: BookOpen,
      gradient: "from-purple-500 to-violet-500"
    },
    {
      title: "Expertise Sectorielle",
      description: "Spécialisation dans tous les domaines du droit avec des agents IA spécialisés",
      icon: Scale,
      gradient: "from-orange-500 to-red-500"
    }
  ];

  const testimonials = [
    {
      name: "Maître Ahmed Benaissa",
      role: "Avocat d'Affaires, Alger",
      content: "Misan a révolutionné ma pratique du droit. La précision des documents générés et la rapidité d'exécution sont remarquables.",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
    },
    {
      name: "Maître Fatima Meziani",
      role: "Cabinet Juridique, Oran",
      content: "L'assistant IA comprend parfaitement les subtilités du droit algérien. Un outil indispensable pour notre cabinet.",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face"
    },
    {
      name: "Maître Karim Hamidi",
      role: "Conseil Juridique, Constantine",
      content: "Gain de temps considérable dans la rédaction de contrats. La qualité juridique est au rendez-vous.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header Misan - identique à l'application */}
      <div className="flex items-center justify-between px-6 py-3 text-white border-b-2 border-red-700" style={{ backgroundColor: '#006A35' }}>
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold">Misan</div>
          <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
            Assistant IA Juridique
          </Badge>
        </div>

        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateToApp}
            className="text-white hover:bg-white/20"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Assistant IA
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateToPricing}
            className="text-white hover:bg-white/20"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Tarifs
          </Button>

          {userInfo.role !== 'admin' && (
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4" />
              <span className="text-sm font-medium">
                {userInfo.tokens.toLocaleString()} {t.tokens}
              </span>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSetCartOpen(true)}
            className="text-white hover:bg-white/20 relative"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            {t.cart}
            {cartLength > 0 && (
              <Badge className="absolute -top-2 -right-2 w-5 h-5 text-xs bg-red-500 text-white">
                {cartLength}
              </Badge>
            )}
          </Button>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">
              {t.subscriptionUntil} {userInfo.subscriptionEnd}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 p-2 hover:bg-white/20 text-white rounded-md transition-colors outline-none ring-0 focus:ring-2 focus:ring-white/50">
              <Avatar className="w-8 h-8">
                <AvatarImage src={userInfo.avatar} alt={userInfo.name} />
                <AvatarFallback className="bg-white/20 text-white text-xs">
                  {userInfo.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden md:block">
                {userInfo.name}
              </span>
              <ChevronDown className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end">
              <DropdownMenuLabel className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {t.myProfile}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => onProfileMenuClick('accountInfo')}>
                <User className="w-4 h-4 mr-2" />
                <div className="flex flex-col">
                  <span>{t.accountInfo}</span>
                  <span className="text-xs text-muted-foreground">{userInfo.email}</span>
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => onProfileMenuClick('changePassword')}>
                <Key className="w-4 h-4 mr-2" />
                {t.changePassword}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => onProfileMenuClick('billing')}>
                <Receipt className="w-4 h-4 mr-2" />
                <div className="flex flex-col">
                  <span>{t.billing}</span>
                  <span className="text-xs text-muted-foreground">{t.invoiceHistory}</span>
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => onProfileMenuClick('addresses')}>
                <MapPin className="w-4 h-4 mr-2" />
                {t.addresses}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => onProfileMenuClick('preferences')}>
                <Settings className="w-4 h-4 mr-2" />
                <div className="flex flex-col">
                  <span>{t.preferences}</span>
                  <span className="text-xs text-muted-foreground">{t.siteLanguage} • {t.chatLanguage}</span>
                </div>
              </DropdownMenuItem>
              
              {userInfo.role === 'admin' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onProfileMenuClick('admin')}>
                    <Building2 className="w-4 h-4 mr-2" />
                    <div className="flex flex-col">
                      <span>Administration</span>
                      <span className="text-xs text-muted-foreground">Gérer utilisateurs et paramètres</span>
                    </div>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Contenu de la page d'accueil */}
      <main className="flex-1">
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
              Révolutionnez votre pratique du droit avec l'intelligence artificielle.
              Expertise, rédaction et assistance juridique spécialisée pour les professionnels du droit algérien.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={onStartChat}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 text-lg"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Commencer un gratuitement
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={onNavigateToPricing}
                className="px-8 py-4 text-lg border-emerald-600 text-emerald-600 hover:bg-emerald-50"
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

        {/* Témoignages */}
        <section className="py-20 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-800 mb-4">
                Ils nous font confiance
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Des professionnels du droit algérien utilisent déjà Misan pour optimiser leur pratique
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
              Rejoignez les centaines de professionnels qui utilisent déjà Misan pour révolutionner leur activité juridique
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={onStartChat}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 text-lg"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Essayer gratuitement
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={onNavigateToPricing}
                className="px-8 py-4 text-lg border-emerald-600 text-emerald-600 hover:bg-emerald-50"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Découvrir les tarifs
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            
            <div className="mt-6 max-w-2xl mx-auto">
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-emerald-200">
                <div className="text-sm text-slate-700 space-y-2">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-emerald-700">Essai gratuit de 7 jours - Sans engagement</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                      <span>Accès complet à tous les agents IA</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                      <span>1 million de jetons offerts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                      <span>Éditeur de documents avancé</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                      <span>Support client prioritaire</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                      <span>Aucune carte bancaire requise</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                      <span>Annulation en un clic</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer - identique à l'application */}
      <Footer />
    </div>
  );
}