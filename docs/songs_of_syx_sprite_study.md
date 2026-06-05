# Songs of Syx Sprite Study — Technical Report

This document compiles the visual, asset pipeline, and rendering standards used in *Songs of Syx* (extracted from the mod.io documentation). It outlines how Pixeldarium's sprites and rendering pipelines can align with these visual standards.

## 1. Sheet Layout & Structure

### The Dual-Map Layout
Every sprite sheet in *Songs of Syx* is split horizontally into two equal halves (side-by-side):
* **Left Half (Diffuse Map)**: Contains the visual sprite representing the character, building, or item.
* **Right Half (Normal Map)**: Encodes surface angles as RGB vectors (`X=Red`, `Y=Green`, `Z=Blue`) to enable real-time 3D lighting, depth, and shadow rendering on a desaturated or grayscale sprite.

```
+-----------------------------------+-----------------------------------+
|                                   |                                   |
|                                   |                                   |
|            DIFFUSE MAP            |            NORMAL MAP             |
|            (Grayscale)            |            (RGB Vector)           |
|                                   |                                   |
|                                   |                                   |
+-----------------------------------+-----------------------------------+
|<---------- Width / 2 ------------>|<---------- Width / 2 ------------>|
|<------------------------------ Width -------------------------------->|
```

### Omitting Normal Maps
If a normal map is not used or needed for a given sprite, the right half of the sprite sheet must not be left transparent or black. Instead, it must be filled with a flat background color of **RGB (128, 128, 255)** (hex `#8080FF`), which represents a flat, neutral normal vector pointing directly outward (positive Z-axis).

### Grid Lines and Templates
* Template sprite sheets contain colored grid lines or borders to outline individual sprite frames for the artist's convenience.
* **Critical Engine Behavior**: The game engine does not programmatically parse the pixel colors of the grid lines to detect borders. Instead, individual frame coordinate dimensions are hardcoded in the game's initialization (`init`) files.

---

## 2. Palette, Color Constraints, and Dynamic Tinting

To maximize variety without bloating memory, *Songs of Syx* utilizes a desaturation-tinting pipeline:
* **Grayscale Base Textures**: Diffuse sprites are drawn desaturated (grayscale or with very low saturation).
* **Runtime Tint Multiplication**: The game engine dynamically multiplies the desaturated diffuse pixels with color constants defined in the configuration files.
* **Asset Reuse**: This allows a single base sprite to represent wide varieties of skin tones, hair colors, or uniforms.

---

## 3. Normal Map Generation Workflow

Because hand-drawing normal maps at low resolutions is extremely difficult, the modding guide recommends the following workflow:
1. **Height Map Creation**: Create a desaturated grayscale sprite on a pure black background. In this map:
   * **Pure Black (RGB 0, 0, 0)**: Represents a height of zero.
   * **Whiteness (RGB 255, 255, 255)**: Represents the maximum height of the sprite.
2. **Filter Conversion**: Run a normal map generator filter/plugin (e.g., standard normal map plugins for Paint.net, Photoshop, or GIMP) over the height map to output the finished RGB normal vector map.
3. **Stitching**: Place the height-map-derived normal map side-by-side with the diffuse map on the sprite sheet.

---

## 4. Shadow Layers

* **Height-based Opacity**: Shadow sprites/layers are rendered with specific alpha/opacity values that the engine interprets as height/density data.
* **Dynamic Shadows**: The transparency level determines how much light is blocked at different pixels, enabling the engine's lighting shaders to cast realistic soft shadows relative to the height of the light source.

---

## 5. Animations & Frame Cycles

### Race Spritesheet Layout
* **Left Side**: Portrait components (facial hair, noses, hair, ears, mouths, eyebrows, eyes, pupils, armor).
* **Right Side**: Action animations and body states:
  * **Walking Loop**: Consists of exactly **2 frames** alternating shoulders and arms forward:
    1. Right arm and shoulder forward.
    2. Left arm and shoulder forward.
  * **Carrying**: A static frame (or short loop) showing both arms outstretched (used when hauling resources).
  * **Waving**: Idle attention-getting animation.
  * **Laying/Sleeping**: Split into individual parts (legs, torso, arms, head) designed to align underneath blankets.
  * **Death states**: Rendered in stages (gore, rotting flesh layers, and finally a clean skeleton).

### Animal Spritesheet Layout
Contains a linear, simpler sequence of states:
* Icon
* Baby Stage
* Moving (walking/running)
* Laying
* Grace (idle animation)
* Blown up / Rotting / Skeleton (death states)
