import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
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
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [recoveryEmailError, setRecoveryEmailError] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleRecoverPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryEmailError('');
    
    const trimmedEmail = recoveryEmail.trim();
    
    if (!trimmedEmail) {
      setRecoveryEmailError('Informe seu e-mail para recuperar a senha');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setRecoveryEmailError('Informe um endereço de e-mail válido');
      return;
    }

    setIsRecovering(true);

    try {
      const result = await apiService.recuperarSenha(trimmedEmail, API_URL);

      if (result.success) {
        toast({
          title: 'Solicitação enviada',
          description: 'Verifique seu e-mail para instruções de recuperação',
        });
        setShowRecovery(false);
        setRecoveryEmail('');
      } else {
        toast({
          title: 'Erro',
          description: result.error || 'Não foi possível processar a solicitação',
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
      setIsRecovering(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    
    if (!formData.email || !formData.password) {
      if (!formData.email) {
        setEmailError('Informe seu e-mail');
      }
      if (!formData.password) {
        toast({
          title: 'Senha obrigatória',
          description: 'Preencha sua senha',
          variant: 'destructive',
        });
      }
      return;
    }

    if (!validateEmail(formData.email)) {
      setEmailError('Informe um endereço de e-mail válido');
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
      <div className="mb-10 flex flex-col items-center">
        <img 
          src={amparaLogo} 
          alt="AMPARA" 
          className="h-20 w-auto mb-4 animate-scale-in"
          style={{ animationDuration: '0.6s', animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
        <h1 className="text-2xl font-bold text-foreground font-display animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'backwards' }}>Bem Vinda</h1>
        <p className="text-sm text-muted-foreground mt-2 animate-fade-in" style={{ animationDelay: '0.35s', animationFillMode: 'backwards' }}>Você não está sozinha.</p>
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
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              if (emailError) setEmailError('');
            }}
            className={`h-14 bg-card border-border rounded-2xl focus:border-primary focus:ring-primary text-base ${emailError ? 'border-destructive' : ''}`}
          />
          {emailError && (
            <p className="text-sm text-destructive mt-1">{emailError}</p>
          )}
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
          <button
            type="button"
            onClick={() => {
              setShowRecovery(true);
              setRecoveryEmail(formData.email);
            }}
            className="text-sm text-primary hover:text-primary/80 transition-colors mt-1"
          >
            Esqueceu sua senha?
          </button>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-14 gradient-primary hover:shadow-medium text-primary-foreground font-semibold text-base mt-6 rounded-2xl transition-all duration-300"
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

      {/* Password Recovery Modal */}
      {showRecovery && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="w-full max-w-sm bg-card rounded-3xl p-6 shadow-lg border border-border animate-scale-in">
            <button
              onClick={() => setShowRecovery(false)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Voltar</span>
            </button>
            
            <h2 className="text-xl font-bold text-foreground mb-2">Recuperar senha</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Informe seu e-mail cadastrado para receber instruções de recuperação.
            </p>
            
            <form onSubmit={handleRecoverPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recovery-email" className="text-sm font-semibold text-foreground">
                  E-mail
                </Label>
                <Input
                  id="recovery-email"
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => {
                    setRecoveryEmail(e.target.value);
                    if (recoveryEmailError) setRecoveryEmailError('');
                  }}
                  className={`h-14 bg-background border-border rounded-2xl focus:border-primary focus:ring-primary text-base ${recoveryEmailError ? 'border-destructive' : ''}`}
                  autoFocus
                />
                {recoveryEmailError && (
                  <p className="text-sm text-destructive mt-1">{recoveryEmailError}</p>
                )}
              </div>
              
              <Button
                type="submit"
                disabled={isRecovering}
                className="w-full h-14 gradient-primary hover:shadow-medium text-primary-foreground font-semibold text-base rounded-2xl transition-all duration-300"
              >
                {isRecovering ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Enviando...
                  </span>
                ) : (
                  'Enviar instruções'
                )}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="text-xs text-muted-foreground mt-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
        Proteção sempre que você precisar
      </p>
    </div>
  );
};

export default LoginPage;
