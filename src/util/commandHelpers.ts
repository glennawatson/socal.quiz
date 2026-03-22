import { ComponentType, TextInputStyle } from "discord-api-types/v10";
import { TextInputBuilder } from "@discordjs/builders";

/**
 * Creates a Discord modal text input component.
 *
 * @param customId - The custom ID used to identify this input in interaction data.
 * @param label - The label displayed above the text input.
 * @param style - The text input style (short single-line or paragraph multi-line).
 * @param value - Optional pre-filled value for the input.
 * @param required - Whether the input is required. Defaults to `true`.
 * @returns A configured {@link TextInputBuilder} instance.
 */
export function createTextInput(
  customId: string,
  label: string,
  style: TextInputStyle,
  value?: string,
  required = true,
): TextInputBuilder {
  let textInput = new TextInputBuilder({
    type: ComponentType.TextInput,
    custom_id: customId,
    label,
    style,
    required,
  });

  if (value) {
    textInput = textInput.setValue(value);
  }

  return textInput;
}
