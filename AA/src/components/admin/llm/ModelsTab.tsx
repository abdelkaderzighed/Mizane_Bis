import { Brain, Edit } from 'lucide-react';

import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../ui/table';
import type { LLMConfig, LLMSettings, LLMType } from '../../../types';

interface ModelsTabProps {
  llmSettings: LLMSettings;
  onToggleModel: (modelId: LLMType, enabled: boolean) => void;
  onUpdateModel: (modelId: LLMType, field: keyof LLMConfig, value: unknown) => void;
  onToggleDefaultModel: (modelId: LLMType) => void;
}

export function ModelsTab({
  llmSettings,
  onToggleModel,
  onUpdateModel,
  onToggleDefaultModel
}: ModelsTabProps) {
  const models = llmSettings.models || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modèles LLM</CardTitle>
        <CardDescription>Activez, configurez et testez les modèles disponibles</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Modèle</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Coût/Token</TableHead>
              <TableHead>Max Tokens</TableHead>
              <TableHead>API</TableHead>
              <TableHead>Par Défaut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.values(models)
              .filter((model): model is LLMConfig => Boolean(model && model.id))
              .map(model => (
                <TableRow key={model.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Brain className={`w-4 h-4 ${model.color || 'text-gray-600'}`} />
                      <div>
                        <div className="font-medium">{model.name || 'Sans nom'}</div>
                        <div className="text-sm text-muted-foreground">{model.provider || 'Inconnu'}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={model.isEnabled || false}
                        onCheckedChange={enabled => onToggleModel(model.id, enabled)}
                      />
                      <Badge
                        variant={model.isEnabled ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {model.isEnabled ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={model.isPremium ? 'default' : 'outline'} className="text-xs">
                      {model.isPremium ? 'Premium' : 'Gratuit'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.000001"
                      value={model.costPerToken || 0}
                      onChange={event =>
                        onUpdateModel(
                          model.id,
                          'costPerToken',
                          parseFloat(event.target.value) || 0
                        )
                      }
                      className="w-24 text-xs"
                      disabled={!model.isEnabled}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={model.maxTokensPerRequest || 0}
                      onChange={event =>
                        onUpdateModel(
                          model.id,
                          'maxTokensPerRequest',
                          parseInt(event.target.value, 10) || 0
                        )
                      }
                      className="w-24 text-xs"
                      disabled={!model.isEnabled}
                    />
                  </TableCell>
                  <TableCell>
                    {model.requiresApiKey && model.apiKeyName && (
                      <Badge variant="outline" className="text-xs">
                        {model.apiKeyName}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={llmSettings.defaultModels.includes(model.id)}
                      onCheckedChange={() => onToggleDefaultModel(model.id)}
                      disabled={!model.isEnabled}
                    />
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Brain className={`w-5 h-5 ${model.color || 'text-gray-600'}`} />
                            Configuration {model.name || 'Modèle'}
                          </DialogTitle>
                          <DialogDescription>
                            Paramètres détaillés pour {model.provider || 'ce modèle'}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-4">
                            <div>
                              <Label>URL de base</Label>
                              <Input
                                value={model.baseUrl || ''}
                                onChange={event =>
                                  onUpdateModel(model.id, 'baseUrl', event.target.value)
                                }
                                placeholder="https://api.example.com/v1"
                              />
                            </div>
                            <div>
                              <Label>Température</Label>
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="2"
                                value={model.temperature || 0.7}
                                onChange={event =>
                                  onUpdateModel(
                                    model.id,
                                    'temperature',
                                    parseFloat(event.target.value) || 0.7
                                  )
                                }
                              />
                            </div>
                            <div>
                              <Label>Timeout (ms)</Label>
                              <Input
                                type="number"
                                value={model.timeout || 30000}
                                onChange={event =>
                                  onUpdateModel(
                                    model.id,
                                    'timeout',
                                    parseInt(event.target.value, 10) || 30000
                                  )
                                }
                              />
                            </div>
                            <div>
                              <Label>Limite de débit (/min)</Label>
                              <Input
                                type="number"
                                value={model.rateLimitPerMinute || 1000}
                                onChange={event =>
                                  onUpdateModel(
                                    model.id,
                                    'rateLimitPerMinute',
                                    parseInt(event.target.value, 10) || 1000
                                  )
                                }
                              />
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <Label>Fonctionnalités supportées</Label>
                              <div className="space-y-2 mt-2">
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={model.supportedFeatures?.streaming || false}
                                    onCheckedChange={checked =>
                                      onUpdateModel(model.id, 'supportedFeatures', {
                                        ...model.supportedFeatures,
                                        streaming: checked
                                      })
                                    }
                                  />
                                  <Label className="text-sm">Streaming</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={model.supportedFeatures?.functions || false}
                                    onCheckedChange={checked =>
                                      onUpdateModel(model.id, 'supportedFeatures', {
                                        ...model.supportedFeatures,
                                        functions: checked
                                      })
                                    }
                                  />
                                  <Label className="text-sm">Function Calling</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={model.supportedFeatures?.vision || false}
                                    onCheckedChange={checked =>
                                      onUpdateModel(model.id, 'supportedFeatures', {
                                        ...model.supportedFeatures,
                                        vision: checked
                                      })
                                    }
                                  />
                                  <Label className="text-sm">Vision</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={model.supportedFeatures?.embeddings || false}
                                    onCheckedChange={checked =>
                                      onUpdateModel(model.id, 'supportedFeatures', {
                                        ...model.supportedFeatures,
                                        embeddings: checked
                                      })
                                    }
                                  />
                                  <Label className="text-sm">Embeddings</Label>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <DialogFooter className="flex flex-col items-end gap-2 sm:flex-row sm:justify-between">
                          <div className="text-xs text-muted-foreground sm:text-left w-full">
                            Les modifications seront appliquées après avoir cliqué sur « Sauvegarder la configuration LLM ».
                          </div>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
