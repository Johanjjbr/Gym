/**
 * Cuestionario inicial (6 preguntas) para quien entrena por su cuenta.
 * Al terminar se guarda el perfil, la meta semanal y se asigna la rutina.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Check, HeartPulse, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { cn } from '../components/ui/utils';
import {
  ONBOARDING_QUESTIONS, buildOnboardingPayload, isAnswered, toggleMulti, type OnboardingAnswers,
} from '../lib/homeWorkout';
import { useCompleteOnboarding } from '../hooks/useHomeWorkout';
import { useAuth } from '../contexts/AuthContext';

export function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const complete = useCompleteOnboarding();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [accepted, setAccepted] = useState(false);

  const total = ONBOARDING_QUESTIONS.length;
  const isHealthStep = step === total;
  const q = ONBOARDING_QUESTIONS[Math.min(step, total - 1)];

  const choose = (value: string) => {
    if (q.multiple) {
      setAnswers((a) => ({ ...a, [q.key]: toggleMulti(a[q.key] as string[] | undefined, value) }));
    } else {
      setAnswers((a) => ({ ...a, [q.key]: value }));
      // Avanza solo en preguntas de una respuesta
      setTimeout(() => setStep((s) => Math.min(s + 1, total)), 180);
    }
  };

  const finish = async () => {
    const payload = buildOnboardingPayload(answers);
    await complete.mutateAsync(payload);
    navigate('/usuario/hoy', { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-md flex-col" data-testid="onboarding">
      {/* Progreso */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-lg p-2 text-muted-foreground hover:bg-card disabled:opacity-0"
          aria-label="Anterior"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-1 gap-1.5" aria-hidden>
          {Array.from({ length: total + 1 }).map((_, i) => (
            <div key={i} className={cn('h-1.5 flex-1 rounded-full', i <= step ? 'bg-primary' : 'bg-border')} />
          ))}
        </div>
        <span className="w-10 text-right text-xs text-muted-foreground">{Math.min(step + 1, total + 1)}/{total + 1}</span>
      </div>

      {step === 0 && (
        <p className="mb-2 text-sm text-primary">¡Hola{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! Armemos tu plan.</p>
      )}

      {!isHealthStep ? (
        <>
          <h2 className="text-2xl font-semibold tracking-tight">{q.title}</h2>
          {q.subtitle && <p className="mt-1 text-sm text-muted-foreground">{q.subtitle}</p>}
          <div className="mt-6 space-y-3">
            {q.options.map((o) => {
              const a = answers[q.key];
              const selected = q.multiple ? Array.isArray(a) && a.includes(o.value) : a === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => choose(o.value)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl border px-4 py-4 text-left transition-colors',
                    selected ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/40',
                  )}
                  aria-pressed={selected}
                >
                  <span>
                    <span className="block font-medium">{o.label}</span>
                    {o.hint && <span className="block text-xs text-primary">{o.hint}</span>}
                  </span>
                  {selected && <Check className="h-5 w-5 text-primary" />}
                </button>
              );
            })}
          </div>
          {q.multiple && (
            <Button className="mt-auto w-full" size="lg" disabled={!isAnswered(q, answers)} onClick={() => setStep((s) => s + 1)}>
              Continuar
            </Button>
          )}
        </>
      ) : (
        <>
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <HeartPulse className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Antes de empezar</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Los ejercicios son generales y no reemplazan la indicación de un médico o entrenador. Si tienes alguna
            condición de salud, lesión o estás embarazada, consulta a un profesional antes de empezar.
            Si sientes dolor, mareo o falta de aire, detente.
          </p>
          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-4">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 h-5 w-5 accent-[#10f94e]"
              data-testid="health-accept"
            />
            <span className="text-sm">Entiendo y entreno bajo mi responsabilidad.</span>
          </label>
          <Button
            className="mt-auto w-full"
            size="lg"
            disabled={!accepted || complete.isPending || ONBOARDING_QUESTIONS.some((x) => !isAnswered(x, answers))}
            onClick={finish}
            data-testid="onboarding-finish"
          >
            {complete.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ver mi plan
          </Button>
        </>
      )}
    </div>
  );
}
