"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { ensureGooglePlacesScript } from "@/lib/google-maps/ensure-places-script";

export type GooglePlacesLocationInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "ref"
> & {
  value: string;
  onValueChange: (value: string) => void;
};

export function GooglePlacesLocationInput({
  value,
  onValueChange,
  ...inputProps
}: GooglePlacesLocationInputProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const onValueChangeRef = React.useRef(onValueChange);
  React.useEffect(() => {
    onValueChangeRef.current = onValueChange;
  }, [onValueChange]);

  const [mapsReady, setMapsReady] = React.useState(false);

  React.useEffect(() => {
    if (!apiKey) {
      return;
    }
    let cancelled = false;
    ensureGooglePlacesScript(apiKey)
      .then(() => {
        if (!cancelled) {
          setMapsReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMapsReady(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  React.useEffect(() => {
    if (!apiKey || !mapsReady || !inputRef.current) {
      return;
    }

    const inputEl = inputRef.current;
    const autocomplete = new google.maps.places.Autocomplete(inputEl, {
      fields: ["formatted_address", "name"],
    });

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const label =
        place.formatted_address ?? place.name ?? inputEl.value.trim();
      if (label) {
        onValueChangeRef.current(label);
      }
    });

    return () => {
      listener.remove();
      google.maps.event.clearInstanceListeners(autocomplete);
    };
  }, [apiKey, mapsReady]);

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      autoComplete="off"
      {...inputProps}
    />
  );
}
