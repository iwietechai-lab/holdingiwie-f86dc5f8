import { Company } from '@/types/auth';

export const companies: Company[] = [
  {
    id: 'iwie-holding',
    name: 'IWIE Holding',
    icon: '🚀',
    color: 'hsl(250, 89%, 65%)',
    description: 'Holding principal - Dirección General',
  },
  {
    id: 'iwie-drones',
    name: 'IWIE Drones',
    icon: '🚁',
    color: 'hsl(200, 100%, 60%)',
    description: 'Tecnología de drones avanzada para industria y agricultura',
  },
  {
    id: 'iwie-agro',
    name: 'IWIE Agro',
    icon: '🌾',
    color: 'hsl(120, 70%, 50%)',
    description: 'Soluciones agrícolas innovadoras con IA',
  },
  {
    id: 'iwie-factory',
    name: 'IWIE Factory',
    icon: '🏭',
    color: 'hsl(30, 90%, 55%)',
    description: 'Manufactura inteligente y automatización',
  },
  {
    id: 'iwie-energy',
    name: 'IWIE Energy',
    icon: '⚡',
    color: 'hsl(50, 100%, 50%)',
    description: 'Energías renovables y almacenamiento',
  },
  {
    id: 'iwie-legal',
    name: 'IWIE Legal',
    icon: '⚖️',
    color: 'hsl(220, 60%, 50%)',
    description: 'Servicios legales y asesoría corporativa',
  },
  {
    id: 'iwie-motors',
    name: 'IWIE Motors',
    icon: '🚗',
    color: 'hsl(0, 85%, 55%)',
    description: 'Vehículos eléctricos y movilidad sostenible',
  },
  {
    id: 'beeflee',
    name: 'Beeflee',
    icon: '🐝',
    color: 'hsl(45, 100%, 50%)',
    description: 'Apicultura tecnológica y polinización',
  },
  {
    id: 'udelem',
    name: 'Udelem',
    icon: '🎓',
    color: 'hsl(220, 80%, 60%)',
    description: 'Educación online y capacitación',
  },
  {
    id: 'busia',
    name: 'Busia',
    icon: '💼',
    color: 'hsl(280, 70%, 55%)',
    description: 'Consultoría empresarial y negocios',
  },
  {
    id: 'aipasajes',
    name: 'AIPasajes',
    icon: '✈️',
    color: 'hsl(190, 90%, 50%)',
    description: 'Viajes inteligentes con IA',
  },
  {
    id: 'iwie-link',
    name: 'Iwie Link',
    icon: '🌐',
    color: 'hsl(170, 80%, 45%)',
    description: 'Conectividad y comunicaciones corporativas',
  },
];

export const getCompanyById = (id: string): Company | undefined => {
  return companies.find(company => company.id === id);
};
