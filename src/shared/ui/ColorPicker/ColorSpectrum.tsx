import { useState } from "react";
import { ColorArea, ColorThumb, parseColor } from "react-aria-components/ColorArea";
import { ColorSlider, SliderTrack, SliderOutput } from "react-aria-components/ColorSlider";
import { Label } from "react-aria-components/Label";
import { I18nProvider } from "react-aria-components/I18nProvider";

export default function ColorSpectrum({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  // Preserve hue when saturation/brightness is zero; hex alone loses that information.
  const [color, setColor] = useState(() => parseColor(value).toFormat("hsb"));
  if (color.toString("hex").toLowerCase() !== value) {
    setColor(parseColor(value).toFormat("hsb"));
  }
  const change = (next: typeof color) => {
    setColor(next);
    onValueChange(next.toString("hex").toLowerCase());
  };
  return (
    <I18nProvider locale="de-DE">
      <ColorArea
        className="color-spectrum"
        aria-label="Sättigung und Helligkeit"
        colorSpace="hsb"
        xChannel="saturation"
        yChannel="brightness"
        value={color}
        onChange={change}
      >
        <ColorThumb className="color-thumb" />
      </ColorArea>
      <ColorSlider
        className="color-hue"
        channel="hue"
        colorSpace="hsb"
        value={color}
        onChange={change}
      >
        <Label>Farbton</Label>
        <SliderOutput />
        <SliderTrack className="color-hue-track">
          <ColorThumb className="color-thumb" />
        </SliderTrack>
      </ColorSlider>
    </I18nProvider>
  );
}
