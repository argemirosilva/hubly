import {
  Scissors, Sparkles, Droplets, Sun, Star, Heart, Zap, Flower2,
  Hand, Eye, Smile, Wind, Waves, Brush, Palette, Crown, Gem,
  Syringe, Stethoscope, Activity, Dumbbell, Leaf, Coffee, Music,
  Camera, Shirt, Baby, Dog, type LucideIcon,
} from "lucide-react";

// ─── Mapeamento de palavras-chave → ícone ─────────────────────────────────────
const KEYWORD_MAP: Array<{ keywords: string[]; icon: LucideIcon; color: string }> = [
  // Cabelo
  { keywords: ["cabelo", "corte", "escova", "tintura", "coloração", "mechas", "luzes", "progressiva", "relaxamento", "permanente", "hidratação capilar", "queratina", "penteado", "tranças", "dreadlock"], icon: Scissors, color: "oklch(55% 0.22 264)" },
  // Unhas
  { keywords: ["unhas", "manicure", "pedicure", "gel", "acrigel", "fibra", "nail", "cutícula", "esmalt", "alongamento de unhas"], icon: Sparkles, color: "oklch(62% 0.18 320)" },
  // Pele / Estética facial
  { keywords: ["limpeza de pele", "facial", "peeling", "microdermoabrasão", "botox", "preenchimento", "skincare", "hidratação facial", "máscara", "esfoliação facial"], icon: Sun, color: "oklch(72% 0.16 60)" },
  // Depilação
  { keywords: ["depilação", "cera", "laser", "epilação", "pelos", "buço"], icon: Zap, color: "oklch(72% 0.16 80)" },
  // Massagem / Corpo
  { keywords: ["massagem", "relaxante", "drenagem", "linfática", "modeladora", "corporal", "spa", "shiatsu", "reflexologia", "pedras quentes"], icon: Waves, color: "oklch(62% 0.18 200)" },
  // Sobrancelha / Cílios
  { keywords: ["sobrancelha", "cílios", "design", "henna", "laminação", "extensão de cílios", "micropigmentação", "brow"], icon: Eye, color: "oklch(55% 0.22 30)" },
  // Maquiagem
  { keywords: ["maquiagem", "make", "noiva", "social", "artística", "airbrush"], icon: Palette, color: "oklch(62% 0.18 340)" },
  // Tratamentos capilares
  { keywords: ["tratamento", "reconstrução", "nutrição", "cauterização", "botox capilar", "olaplex"], icon: Droplets, color: "oklch(55% 0.22 220)" },
  // Barba / Barbearia
  { keywords: ["barba", "bigode", "navalha", "barbearia", "degradê", "fade", "navalhado"], icon: Brush, color: "oklch(45% 0.12 260)" },
  // Estética corporal
  { keywords: ["criolipólise", "radiofrequência", "ultrassom", "lipocavitação", "endermologia", "vacuoterapia", "eletroestimulação"], icon: Activity, color: "oklch(55% 0.22 155)" },
  // Saúde / Médico
  { keywords: ["consulta", "médico", "clínica", "exame", "avaliação", "dermatologista", "nutricionista", "psicólogo"], icon: Stethoscope, color: "oklch(55% 0.22 180)" },
  // Injeção / Procedimentos
  { keywords: ["injeção", "aplicação", "procedimento", "harmonização", "fio", "bioestimulador"], icon: Syringe, color: "oklch(45% 0.12 200)" },
  // Fitness / Personal
  { keywords: ["personal", "treino", "fitness", "pilates", "yoga", "funcional", "academia"], icon: Dumbbell, color: "oklch(62% 0.18 140)" },
  // Bem-estar / Holístico
  { keywords: ["reiki", "meditação", "acupuntura", "aromaterapia", "cristais", "terapia"], icon: Leaf, color: "oklch(62% 0.18 155)" },
  // Bebê / Infantil
  { keywords: ["infantil", "bebê", "criança", "corte infantil"], icon: Baby, color: "oklch(72% 0.16 300)" },
  // Pet
  { keywords: ["pet", "cachorro", "gato", "banho", "tosa"], icon: Dog, color: "oklch(62% 0.18 40)" },
  // Casamento / Noiva
  { keywords: ["noiva", "casamento", "debutante", "formatura", "festa"], icon: Crown, color: "oklch(72% 0.16 60)" },
  // Joias / Piercing
  { keywords: ["piercing", "tatuagem", "tattoo", "brinco", "joia"], icon: Gem, color: "oklch(55% 0.22 264)" },
  // Fotografia
  { keywords: ["foto", "ensaio", "book", "fotografia"], icon: Camera, color: "oklch(45% 0.12 260)" },
  // Moda / Styling
  { keywords: ["styling", "consultoria de imagem", "roupa", "look", "moda"], icon: Shirt, color: "oklch(62% 0.18 320)" },
];

// ─── Ícone padrão ─────────────────────────────────────────────────────────────
const DEFAULT_ICON = { icon: Star, color: "oklch(55% 0.22 264)" };

// ─── Função principal ─────────────────────────────────────────────────────────
export function getServiceIcon(serviceName: string): { icon: LucideIcon; color: string } {
  if (!serviceName) return DEFAULT_ICON;
  const lower = serviceName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const entry of KEYWORD_MAP) {
    for (const kw of entry.keywords) {
      const kwNorm = kw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (lower.includes(kwNorm)) return { icon: entry.icon, color: entry.color };
    }
  }
  return DEFAULT_ICON;
}

// ─── Componente de ícone de serviço ──────────────────────────────────────────
interface ServiceIconProps {
  serviceName: string;
  size?: "xs" | "sm" | "md" | "lg";
  showBackground?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs: { icon: "w-3 h-3", bg: "w-5 h-5 rounded" },
  sm: { icon: "w-3.5 h-3.5", bg: "w-6 h-6 rounded-md" },
  md: { icon: "w-4 h-4", bg: "w-8 h-8 rounded-lg" },
  lg: { icon: "w-5 h-5", bg: "w-10 h-10 rounded-xl" },
};

export function ServiceIcon({ serviceName, size = "md", showBackground = true, className = "" }: ServiceIconProps) {
  const { icon: Icon, color } = getServiceIcon(serviceName);
  const sizes = SIZE_MAP[size];

  if (showBackground) {
    return (
      <div
        className={`flex items-center justify-center flex-shrink-0 ${sizes.bg} ${className}`}
        style={{ background: `${color}18` }}
      >
        <Icon className={sizes.icon} style={{ color }} />
      </div>
    );
  }

  return <Icon className={`${sizes.icon} ${className}`} style={{ color }} />;
}

// ─── Mapeamento de categorias pré-definidas para o formulário ─────────────────
export const SERVICE_CATEGORIES = [
  { value: "cabelo", label: "Cabelo", icon: Scissors, color: "oklch(55% 0.22 264)" },
  { value: "unhas", label: "Unhas", icon: Sparkles, color: "oklch(62% 0.18 320)" },
  { value: "estetica_facial", label: "Estética Facial", icon: Sun, color: "oklch(72% 0.16 60)" },
  { value: "depilacao", label: "Depilação", icon: Zap, color: "oklch(72% 0.16 80)" },
  { value: "massagem", label: "Massagem / Corpo", icon: Waves, color: "oklch(62% 0.18 200)" },
  { value: "sobrancelha", label: "Sobrancelha / Cílios", icon: Eye, color: "oklch(55% 0.22 30)" },
  { value: "maquiagem", label: "Maquiagem", icon: Palette, color: "oklch(62% 0.18 340)" },
  { value: "barba", label: "Barba / Barbearia", icon: Brush, color: "oklch(45% 0.12 260)" },
  { value: "estetica_corporal", label: "Estética Corporal", icon: Activity, color: "oklch(55% 0.22 155)" },
  { value: "saude", label: "Saúde / Clínica", icon: Stethoscope, color: "oklch(55% 0.22 180)" },
  { value: "fitness", label: "Fitness / Personal", icon: Dumbbell, color: "oklch(62% 0.18 140)" },
  { value: "outro", label: "Outro", icon: Star, color: "oklch(55% 0.22 264)" },
] as const;
