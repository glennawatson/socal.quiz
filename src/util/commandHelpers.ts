// Helper function to create text input components
import { TextInputStyle } from "discord-api-types/v10";
import { TextInputBuilder } from "@discordjs/builders";

export function createTextInput(
  customId: string,
  label: string,
  style: TextInputStyle,
  value?: string,
  required = true,
) {
  let textInput = new TextInputBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(style)
    .setRequired(required);

  if (value) {
    textInput = textInput.setValue(value);
  }

  return textInput;
}
