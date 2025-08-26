// utils/openai.mjs
export async function getOpenAI() {
  try {
    const mod = await import('openai');
    return mod.OpenAI ?? mod.default?.OpenAI ?? mod.default;
  } catch {
    throw new Error(
      'The "openai" package is not installed. To use file upload helpers (runFlowWithFile, runFlowWithFileBuffer), install it: npm i openai',
    );
  }
}
