import { Plus } from "@/components/animate-ui/icons/plus";
import { AnimateIcon } from "@animate-ui/react/icons";

export function CommunityIntro({ variant }: { variant: "login" | "feed" }) {
  const isLogin = variant === "login";

  return (
    <section className={`community-intro community-intro--${variant}`} aria-labelledby="community-title">
      <p className="eyebrow">
        <span aria-hidden="true" />
        {isLogin ? "A space for your perspective" : "The community, in focus"}
      </p>
      <h1 id="community-title">
        {isLogin ? "Your moments." : "Good moments."}
        <br />
        <span className="gradient-text">{isLogin ? "More connected." : "Better together."}</span>
      </h1>
      <p className="community-intro__description">
        {isLogin
          ? "A photo, a story, a new point of view. Bring your world to ShinigaCim and find something worth connecting over."
          : "Share what moves you. Discover a new perspective. Make a little room for connection."}
      </p>
      {isLogin ? (
        <div className="community-art" aria-hidden="true">
          <div className="community-art__orbit" />
          <div className="community-art__card community-art__card--back">
            <span className="community-art__landscape" />
            <span>A different perspective</span>
          </div>
          <div className="community-art__card community-art__card--front">
            <AnimateIcon animateOnHover asChild>
              <span className="community-art__spark"><Plus size={24} /></span>
            </AnimateIcon>
            <strong>Share. Connect. Belong.</strong>
            <span>Small moments. Real connections.</span>
          </div>
          <span className="community-art__tag">Made to be shared</span>
        </div>
      ) : null}
    </section>
  );
}
