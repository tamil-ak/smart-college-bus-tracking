import { Human } from '@vladmandic/human';

// Human configuration: Only face detection and face description enabled
const humanConfig = {
  cacheSensitivity: 0,
  modelBasePath: 'https://cdn.jsdelivr.net/npm/@vladmandic/human/models',
  filter: { enabled: false },
  face: {
    enabled: true,
    detector: { enabled: true, rotation: false },
    mesh: { enabled: true },
    iris: { enabled: false },
    description: { enabled: true },
    emotion: { enabled: false },
    antispoof: { enabled: false },
    liveness: { enabled: false },
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  gesture: { enabled: false },
  segmentation: { enabled: false },
};

let humanInstance = null;
let loadPromise = null;

/**
 * Lazy loads and initializes the Human AI library instance
 */
export const getHumanInstance = async () => {
  if (humanInstance) return humanInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const human = new Human(humanConfig);
      await human.load();
      humanInstance = human;
      return humanInstance;
    } catch (err) {
      loadPromise = null;
      console.error('Failed to load Human AI models:', err);
      throw new Error('Failed to load AI face detection models. Please check your internet connection.');
    }
  })();

  return loadPromise;
};

/**
 * Detects face and extracts the exact numeric AI descriptor.
 * Validates:
 * - Exactly one face detected
 * - Rejects if 0 faces
 * - Rejects if >1 faces
 *
 * @param {HTMLCanvasElement|HTMLVideoElement|HTMLImageElement} inputElement
 * @returns {Promise<{success: boolean, descriptor?: number[], error?: string}>}
 */
export const detectAndExtractAiFaceDescriptor = async (inputElement) => {
  try {
    const human = await getHumanInstance();
    const result = await human.detect(inputElement);

    if (!result || !result.face || result.face.length === 0) {
      return {
        success: false,
        error: 'No face detected. Please position your face clearly inside the camera frame.',
      };
    }

    if (result.face.length > 1) {
      return {
        success: false,
        error: `Multiple faces detected (${result.face.length}). Only one face must be visible during registration.`,
      };
    }

    const detectedFace = result.face[0];
    const rawEmbedding = detectedFace.embedding;

    if (!rawEmbedding || rawEmbedding.length === 0) {
      return {
        success: false,
        error: 'Unable to extract AI face descriptor. Please ensure good lighting and look directly at the camera.',
      };
    }

    // Convert TypedArray / Float32Array to standard numeric array without modifying dimensionality
    const descriptor = Array.from(rawEmbedding).map(Number);

    return {
      success: true,
      descriptor,
      face: detectedFace,
    };
  } catch (err) {
    console.error('Error during AI face detection:', err);
    return {
      success: false,
      error: err.message || 'Face detection error. Please try again.',
    };
  }
};
