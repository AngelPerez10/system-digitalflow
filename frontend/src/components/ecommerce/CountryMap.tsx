import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";
import type { FC } from "react";
import countries from "world-atlas/countries-110m.json";

interface CountryMapProps {
  mapColor?: string;
}

/** [longitude, latitude] — react-simple-maps uses GeoJSON order */
const MARKERS: { coordinates: [number, number]; name: string }[] = [
  { coordinates: [-104.657039, 37.2580397], name: "United States" },
  { coordinates: [73.7276105, 20.7504374], name: "India" },
  { coordinates: [-11.6368, 53.613], name: "United Kingdom" },
  { coordinates: [18.0686, 59.3293], name: "Sweden" },
];

const CountryMap: FC<CountryMapProps> = ({ mapColor }) => {
  const fill = mapColor ?? "#D0D5DD";
  const hoverFill = "#465fff";

  return (
    <ComposableMap
      projection="geoMercator"
      projectionConfig={{
        scale: 90,
        center: [0, 15],
      }}
      width={800}
      height={420}
      className="h-full w-full max-w-full [&_svg]:block [&_svg]:h-full [&_svg]:w-full"
      style={{ backgroundColor: "transparent" }}
    >
      <Geographies geography={countries}>
        {({ geographies }) =>
          geographies.map((geo) => (
            <Geography
              key={geo.rsmKey}
              geography={geo}
              style={{
                default: {
                  fill,
                  stroke: "transparent",
                  strokeWidth: 0,
                  outline: "none",
                },
                hover: {
                  fill: hoverFill,
                  fillOpacity: 0.7,
                  cursor: "pointer",
                  outline: "none",
                },
                pressed: { outline: "none" },
              }}
            />
          ))
        }
      </Geographies>
      {MARKERS.map((m) => (
        <Marker key={m.name} coordinates={m.coordinates}>
          <circle
            r={4}
            fill="#465FFF"
            stroke="white"
            strokeWidth={1}
            className="dark:stroke-gray-800"
          />
        </Marker>
      ))}
    </ComposableMap>
  );
};

export default CountryMap;
