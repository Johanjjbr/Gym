import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePhysicalProgress } from '../hooks/usePhysicalProgress';
import { useTrainingAnalytics } from '../hooks/useTrainingAnalytics';
import { useProgressPhotos, useUploadProgressPhoto, useDeleteProgressPhoto } from '../hooks/useProgressPhotos';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { formatDate } from '../lib/format';

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

import {
  TrendingUp, TrendingDown, Activity, Calendar, Dumbbell, BarChart3,
  Camera, Trash2, Target, Zap, Award,
  Plus, Loader2, X, Clock,
} from 'lucide-react';

export function MyProgress() {
  const { user: authUser } = useAuth();
  const userId = authUser?.id || '';
  const userDbId = authUser?.userDbId || '';

  const { data: progress = [], isLoading: loadingProgress } = usePhysicalProgress(userId);
  const { data: analytics, isLoading: loadingAnalytics } = useTrainingAnalytics(userId);
  const { data: photos = [], isLoading: loadingPhotos } = useProgressPhotos(userId);
  const uploadPhoto = useUploadProgressPhoto();
  const deletePhoto = useDeleteProgressPhoto();

  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoNotes, setPhotoNotes] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const latestRecord = progress.length > 0 ? progress[0] : null;
  const firstRecord = progress.length > 0 ? progress[progress.length - 1] : null;

  const calcChange = (latest: number | null | undefined, first: number | null | undefined) => {
    if (!latest || !first) return null;
    return latest - first;
  };

  const weightChange = calcChange(latestRecord?.weight, firstRecord?.weight);
  const bodyFatChange = calcChange(latestRecord?.body_fat, firstRecord?.body_fat);
  const muscleChange = calcChange(latestRecord?.muscle_mass, firstRecord?.muscle_mass);

  const chartData = [...progress].reverse().map(r => ({
    date: formatDate(r.date),
    peso: r.weight,
    grasa: r.body_fat || 0,
    musculo: r.muscle_mass || 0,
  }));

  const currentExercise = analytics?.strengthByExercise.find(e => e.exercise_name === selectedExercise);
  const strengthChartData = currentExercise?.data.map(p => ({
    date: formatDate(p.date),
    peso: p.weight,
    '1RM': p.estimated_1rm,
  })) || [];

  const last8Weeks = analytics?.weeklyVolume.slice(-8) || [];
  const volumeChartData = last8Weeks.map(w => ({
    semana: formatDate(w.week_start),
    volumen: Math.round(w.total_volume),
    sesiones: w.session_count,
  }));

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!photoFile || !userId) return;
    try {
      await uploadPhoto.mutateAsync({
        userId,
        file: photoFile,
        notes: photoNotes || undefined,
      });
      setPhotoFile(null);
      setPhotoNotes('');
      setPhotoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      // error handled in hook
    }
  };

  const handleDeletePhoto = async (photo: any) => {
    if (confirm('¿Eliminar esta foto?')) {
      await deletePhoto.mutateAsync(photo);
    }
  };

  if (!authUser) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">Debes iniciar sesión</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl mb-2">Mi Progreso Físico</h1>
        <p className="text-muted-foreground">Seguimiento de tu evolución y métricas corporales</p>
      </div>

      <Tabs defaultValue="composicion">
        <TabsList>
          <TabsTrigger value="composicion">
            <Activity className="w-4 h-4" />
            Composición
          </TabsTrigger>
          <TabsTrigger value="fuerza">
            <Dumbbell className="w-4 h-4" />
            Fuerza
          </TabsTrigger>
          <TabsTrigger value="resumen">
            <BarChart3 className="w-4 h-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="fotos">
            <Camera className="w-4 h-4" />
            Fotos
          </TabsTrigger>
        </TabsList>

        {/* ═══════════ COMPOSICIÓN ═══════════ */}
        <TabsContent value="composicion" className="space-y-6">
          {loadingProgress ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">Cargando...</p>
              </CardContent>
            </Card>
          ) : progress.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">
                  Aún no tienes registros de progreso físico.<br />
                  Tu entrenador registrará tus mediciones periódicamente.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Peso Actual</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {latestRecord?.weight || 'N/A'} kg
                    </div>
                    {weightChange !== null && (
                      <div className={`flex items-center gap-1 text-sm ${weightChange > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                        {weightChange > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span>{Math.abs(weightChange).toFixed(1)} kg</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Grasa Corporal</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {latestRecord?.body_fat ? `${latestRecord.body_fat}%` : 'N/A'}
                    </div>
                    {bodyFatChange !== null && (
                      <div className={`flex items-center gap-1 text-sm ${bodyFatChange < 0 ? 'text-green-500' : 'text-orange-500'}`}>
                        {bodyFatChange < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                        <span>{Math.abs(bodyFatChange).toFixed(1)}%</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Masa Muscular</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {latestRecord?.muscle_mass ? `${latestRecord.muscle_mass} kg` : 'N/A'}
                    </div>
                    {muscleChange !== null && (
                      <div className={`flex items-center gap-1 text-sm ${muscleChange > 0 ? 'text-green-500' : 'text-orange-500'}`}>
                        {muscleChange > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span>{Math.abs(muscleChange).toFixed(1)} kg</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Evolución Corporal</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" stroke="#888" fontSize={12} />
                      <YAxis stroke="#888" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: '8px', color: '#f0f0f5' }} />
                      <Legend />
                      <Line type="monotone" dataKey="peso" stroke="#10f94e" strokeWidth={2} name="Peso (kg)" />
                      <Line type="monotone" dataKey="grasa" stroke="#ff3b5c" strokeWidth={2} name="Grasa (%)" />
                      <Line type="monotone" dataKey="musculo" stroke="#00d4ff" strokeWidth={2} name="Músculo (kg)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Historial de Mediciones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {progress.map((record: any) => (
                      <div key={record.id} className="p-4 border rounded-lg space-y-2">
                        <p className="font-medium">{formatDate(record.date)}</p>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Peso:</span>
                            <p className="font-semibold">{record.weight} kg</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Grasa:</span>
                            <p className="font-semibold">{record.body_fat ? `${record.body_fat}%` : 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Músculo:</span>
                            <p className="font-semibold">{record.muscle_mass ? `${record.muscle_mass} kg` : 'N/A'}</p>
                          </div>
                        </div>
                        {record.notes && (
                          <div className="pt-2 border-t">
                            <span className="text-xs text-muted-foreground">Notas:</span>
                            <p className="text-sm mt-1">{record.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ═══════════ FUERZA ═══════════ */}
        <TabsContent value="fuerza" className="space-y-6">
          {loadingAnalytics ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">Cargando...</p>
              </CardContent>
            </Card>
          ) : !analytics || analytics.exerciseNames.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground space-y-2">
                  <Dumbbell className="w-12 h-12 mx-auto opacity-30" />
                  <p>Aún no tienes registros de entrenamiento.</p>
                  <p className="text-sm">Registra tus ejercicios en Mi Entrenamiento para ver tu progreso de fuerza.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Progreso de Fuerza</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                    <SelectTrigger className="w-full md:w-72">
                      <SelectValue placeholder="Seleccionar ejercicio..." />
                    </SelectTrigger>
                    <SelectContent>
                      {analytics.exerciseNames.map(name => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {currentExercise && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 border rounded-lg">
                          <p className="text-xs text-muted-foreground">Último peso</p>
                          <p className="text-lg font-bold text-primary">{currentExercise.latest_weight} kg</p>
                        </div>
                        <div className="p-3 border rounded-lg">
                          <p className="text-xs text-muted-foreground">Mejor peso</p>
                          <p className="text-lg font-bold text-[#10f94e]">{currentExercise.best_weight} kg</p>
                        </div>
                        <div className="p-3 border rounded-lg">
                          <p className="text-xs text-muted-foreground">Mejor 1RM</p>
                          <p className="text-lg font-bold text-[#00d4ff]">{currentExercise.best_1rm} kg</p>
                        </div>
                        <div className="p-3 border rounded-lg">
                          <p className="text-xs text-muted-foreground">Mejores reps</p>
                          <p className="text-lg font-bold text-[#ff3b5c]">{currentExercise.best_reps}</p>
                        </div>
                      </div>

                      {strengthChartData.length > 0 && (
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={strengthChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="date" stroke="#888" fontSize={12} />
                            <YAxis stroke="#888" fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: '8px', color: '#f0f0f5' }} />
                            <Legend />
                            <Line type="monotone" dataKey="peso" stroke="#10f94e" strokeWidth={2} name="Peso (kg)" dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="1RM" stroke="#00d4ff" strokeWidth={2} strokeDasharray="5 5" name="1RM Est." dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Mejores Marcas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.strengthByExercise.map(ex => (
                      <div key={ex.exercise_name} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{ex.exercise_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Último: {ex.latest_weight} kg × {ex.latest_reps} reps
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <p className="text-sm font-bold text-primary">{ex.best_weight} kg</p>
                          <p className="text-xs text-muted-foreground">1RM: {ex.best_1rm} kg</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ═══════════ RESUMEN ═══════════ */}
        <TabsContent value="resumen" className="space-y-6">
          {loadingAnalytics ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">Cargando...</p>
              </CardContent>
            </Card>
          ) : !analytics || analytics.weeklyVolume.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground space-y-2">
                  <BarChart3 className="w-12 h-12 mx-auto opacity-30" />
                  <p>Aún no hay suficiente datos de entrenamiento.</p>
                  <p className="text-sm">Comienza a registrar tus entrenamientos para ver tu resumen semanal.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Sesiones</CardTitle>
                    <Dumbbell className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">{analytics.currentWeekSessions}</div>
                    <p className="text-xs text-muted-foreground">esta semana</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ejercicios</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">{analytics.currentWeekExercises}</div>
                    <p className="text-xs text-muted-foreground">esta semana</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Volumen</CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">{Math.round(analytics.currentWeekVolume).toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">kg totales esta semana</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Racha</CardTitle>
                    <Award className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-500">{analytics.streakDays}</div>
                    <p className="text-xs text-muted-foreground">días seguidos entrenando</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Volumen Semanal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={volumeChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="semana" stroke="#888" fontSize={12} />
                      <YAxis stroke="#888" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: '8px', color: '#f0f0f5' }} />
                      <Legend />
                      <Bar dataKey="volumen" fill="#10f94e" radius={[4, 4, 0, 0]} name="Volumen (kg)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Historial Semanal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {last8Weeks.slice().reverse().map(w => (
                      <div key={w.week_start} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">Semana del {formatDate(w.week_start)}</p>
                          <p className="text-xs text-muted-foreground">{w.session_count} sesión(es) · {w.total_exercises} ejercicio(s)</p>
                        </div>
                        <p className="text-sm font-bold text-primary">{Math.round(w.total_volume).toLocaleString()} kg</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ═══════════ FOTOS ═══════════ */}
        <TabsContent value="fotos" className="space-y-6">
          {loadingPhotos ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">Cargando...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Agregar Foto</CardTitle>
                </CardHeader>
                <CardContent>
                  {!photoFile ? (
                    <div
                      className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">Haz clic para seleccionar una foto</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG hasta 5MB</p>
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative">
                        <img
                          src={photoPreview || ''}
                          alt="Preview"
                          className="w-full max-h-64 object-contain rounded-lg border"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setPhotoFile(null);
                            setPhotoPreview(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <Textarea
                        placeholder="Notas (opcional)..."
                        value={photoNotes}
                        onChange={e => setPhotoNotes(e.target.value)}
                        className="resize-none"
                        rows={2}
                      />
                      <Button
                        onClick={handleUpload}
                        disabled={uploadPhoto.isPending}
                        className="w-full"
                      >
                        {uploadPhoto.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4 mr-2" />
                        )}
                        Subir Foto
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo: any) => (
                  <div
                    key={photo.id}
                    className="group relative aspect-[3/4] rounded-xl overflow-hidden border cursor-pointer"
                    onClick={() => setViewingPhoto(photo.id)}
                  >
                    <img
                      src={photo.photo_url}
                      alt={`Foto ${formatDate(photo.date)}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingPhoto(photo.id);
                        }}
                      >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                      </Button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="text-xs text-white">{formatDate(photo.date)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {photos.length === 0 && (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground space-y-2">
                      <Camera className="w-12 h-12 mx-auto opacity-30" />
                      <p>No hay fotos de progreso aún.</p>
                      <p className="text-sm">Sube fotos periódicamente para ver tu evolución visual.</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Dialog open={!!viewingPhoto} onOpenChange={(o) => { if (!o) setViewingPhoto(null); }}>
                {viewingPhoto && (
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>
                        {formatDate(photos.find(p => p.id === viewingPhoto)?.date || '')}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <img
                        src={photos.find(p => p.id === viewingPhoto)?.photo_url}
                        alt="Progress photo"
                        className="w-full rounded-lg"
                      />
                      {photos.find(p => p.id === viewingPhoto)?.notes && (
                        <p className="text-sm text-muted-foreground">
                          {photos.find(p => p.id === viewingPhoto)?.notes}
                        </p>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const photo = photos.find(p => p.id === viewingPhoto);
                          if (photo) {
                            handleDeletePhoto(photo);
                            setViewingPhoto(null);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar Foto
                      </Button>
                    </div>
                  </DialogContent>
                )}
              </Dialog>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
