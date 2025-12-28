import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import amparaLogo from '@/assets/ampara-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/store/appStore';
import { apiService, setApiBaseUrl } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser, setConfig, setLoginTipo, setCoercionMode } = useAppStore();
  const { toast } = useToast();
  
  const API_URL = 'https://amparamulher.org';
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha e-mail e senha',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await apiService.login(
        formData.email,
        formData.password,
        API_URL,
        'login'
      );

      if (result.success && result.data) {
        setUser(result.data.user);
        setConfig(result.data.config);
        setLoginTipo(result.data.loginTipo);
        setApiBaseUrl(result.data.config.apiBaseUrl);
        
        // Se for login de coação, ativar modo coação
        if (result.data.loginTipo === 'coacao') {
          setCoercionMode(true);
          // Navegar para tela falsa de desinstalação
          navigate('/uninstall');
        } else {
          toast({
            title: 'Login realizado',
            description: `Bem-vinda, ${result.data.user.nome}`,
          });
          navigate('/dashboard');
        }
      } else {
        toast({
          title: 'Erro no login',
          description: result.error || 'Credenciais inválidas',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro de conexão',
        description: 'Não foi possível conectar ao servidor',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 safe-area-inset">
      {/* Logo */}
      <div className="mb-10 flex flex-col items-center animate-fade-in">
        <img 
          src={amparaLogo} 
          alt="AMPARA" 
          className="h-20 w-auto mb-4"
        />
        <h1 className="text-2xl font-bold text-foreground font-display">Bem-vinda ao AMPARA</h1>
        <p className="text-sm text-muted-foreground mt-2">Você não está sozinha.</p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5 animate-fade-in" style={{ animationDelay: '0.1s' }}>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-semibold text-foreground">
            E-mail
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="seu.email@exemplo.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="h-14 bg-card border-border rounded-2xl focus:border-primary focus:ring-primary text-base"
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-semibold text-foreground">
            Senha
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="h-14 pr-14 bg-card border-border rounded-2xl focus:border-primary focus:ring-primary text-base"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-14 gradient-primary hover:shadow-medium text-primary-foreground font-semibold text-base mt-8 rounded-2xl transition-all duration-300"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Conectando...
            </span>
          ) : (
            'Entrar'
          )}
        </Button>
      </form>

      {/* Quote */}
      <div className="w-full max-w-sm mt-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="quote-block">
          <p className="text-sm text-muted-foreground">
            "O AMPARA é mais do que uma ferramenta - é um abraço tecnológico, uma mão estendida."
          </p>
        </div>
      </div>

      {/* Footer */}
      <p className="text-xs text-muted-foreground mt-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
        Proteção sempre que você precisar
      </p>
    </div>
  );
};

export default LoginPage;
