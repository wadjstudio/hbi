import { IdentityImage } from "./identity-image";

export const TeamCrest = ({
  name,
  shortName,
  logoUrl,
  isHome = false,
}: {
  name: string;
  shortName?: string;
  logoUrl?: string | null;
  isHome?: boolean;
}) => (
  <i
    className={`team-monogram ${isHome ? "home" : "away"}`}
    data-slot="team-crest"
    aria-hidden="true"
    title={name}
  >
    <IdentityImage
      src={logoUrl}
      width={40}
      height={48}
      alt=""
      loading="eager"
      fallback={
        <>
          {Array.from(shortName || name)
            .slice(0, 2)
            .join("") || "—"}
        </>
      }
    />
  </i>
);
