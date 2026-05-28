import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Users, DollarSign, Sparkles } from "lucide-react";
import { usePermissoes } from "@/hooks/usePermissoes";
import IAFinanceiro from "./IAFinanceiro";
import IAClientes from "./IAClientes";

export default function Insights() {
  const { pode } = usePermissoes();
  const [tab, setTab] = useState("financeiro");

  if (!pode("__admin__")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <Sparkles className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">Você não tem permissão para acessar os Insights.</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto animate-in-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "oklch(78.5% 0.075 85 / 12%)" }}>
          <Sparkles className="w-5 h-5" style={{ color: "oklch(45% 0.060 55)" }} />
        </div>
        <div>
          <h1 className="font-bold text-xl tracking-tight">Insights</h1>
          <p className="text-xs text-muted-foreground">Análise inteligente do seu negócio</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="financeiro" className="gap-1.5 text-xs">
            <DollarSign className="w-3.5 h-3.5" /> Financeiro
          </TabsTrigger>
          <TabsTrigger value="clientes" className="gap-1.5 text-xs">
            <Users className="w-3.5 h-3.5" /> Clientes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="financeiro" className="-mx-4 lg:-mx-6 -mt-2">
          <IAFinanceiro />
        </TabsContent>

        <TabsContent value="clientes" className="-mx-4 lg:-mx-6 -mt-2">
          <IAClientes />
        </TabsContent>
      </Tabs>
    </div>
  );
}
