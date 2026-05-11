'use server';
/**
 * @fileOverview This file implements a Genkit flow for suggesting optimal 'carga por hora' (load per hour) values for tasks.
 *
 * - suggestTaskLoad - A function that suggests the optimal load per hour for a given task.
 * - SuggestTaskLoadInput - The input type for the suggestTaskLoad function.
 * - SuggestTaskLoadOutput - The return type for the suggestTaskLoad function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTaskLoadInputSchema = z.object({
  taskName: z.string().describe('The name of the task or product for which to suggest the load per hour.'),
  context: z.string().optional().describe('Optional historical data or efficiency model details related to the task, provided as a free-form string.'),
});
export type SuggestTaskLoadInput = z.infer<typeof SuggestTaskLoadInputSchema>;

const SuggestTaskLoadOutputSchema = z.object({
  suggestedLoadPerHour: z.number().describe('The suggested optimal load per hour for the given task, as a numerical value.'),
  reasoning: z.string().describe('The reasoning behind the suggested load per hour.'),
});
export type SuggestTaskLoadOutput = z.infer<typeof SuggestTaskLoadOutputSchema>;

export async function suggestTaskLoad(input: SuggestTaskLoadInput): Promise<SuggestTaskLoadOutput> {
  return suggestTaskLoadFlow(input);
}

const suggestTaskLoadPrompt = ai.definePrompt({
  name: 'suggestTaskLoadPrompt',
  input: {schema: SuggestTaskLoadInputSchema},
  output: {schema: SuggestTaskLoadOutputSchema},
  prompt: `Eres un experto planificador de producción con un profundo conocimiento en eficiencia y optimización de tareas.

Tu objetivo es sugerir el valor óptimo de 'carga por hora' (un número) para una tarea o producto específico, basándote en la descripción de la tarea y cualquier contexto adicional proporcionado. Debes justificar tu sugerencia con un razonamiento claro.

Si no hay contexto, haz una estimación razonable basada en el nombre de la tarea.

Tarea: {{{taskName}}}

{{#if context}}
Contexto (datos históricos o modelo de eficiencia): {{{context}}}
{{/if}}`,
});

const suggestTaskLoadFlow = ai.defineFlow(
  {
    name: 'suggestTaskLoadFlow',
    inputSchema: SuggestTaskLoadInputSchema,
    outputSchema: SuggestTaskLoadOutputSchema,
  },
  async input => {
    const {output} = await suggestTaskLoadPrompt(input);
    if (!output) {
      throw new Error('Failed to generate task load suggestion.');
    }
    return output;
  }
);
