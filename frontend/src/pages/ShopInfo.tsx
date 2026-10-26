import { Link } from "react-router-dom";
import { CopyButton } from "../components/Chrome";
import { LoadError } from "../components/LoadError";
import { PageSkeleton } from "../components/Skeletons";
import { mainButton, plainButton } from "../components/ui";
import { bannerUrl, fetchShop, fetchShopPhotos } from "../lib/api";
import { useText } from "../lib/lang";
import { useLoad } from "../lib/useLoad";
import { useTitle } from "../lib/useTitle";

export function ShopInfo() {
  const t = useText();
  const { data, failed, retry } = useLoad(fetchShop, []);
  // Load shop photos independently so a missing table never breaks the page.
  const { data: photos } = useLoad(fetchShopPhotos, []);
  useTitle("Shop Info", "Address, timings and phone number of Pradhan Grocery Store.");
  if (failed) return <LoadError onRetry={retry} />;
  if (!data) return <PageSkeleton />;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold">{t("shopInfo")}</h1>

      {/* Shop photos — shown only when photos exist */}
      {photos && photos.length > 0 && (
        <section className="space-y-2">
          <div className="flex gap-3 overflow-x-auto pb-1">
            {photos.map((photo) => (
              <figure key={photo.id} className="shrink-0">
                <img
                  src={bannerUrl(photo.storage_path)}
                  alt={photo.caption_en ?? "Shop photo"}
                  className="h-48 w-auto max-w-[85vw] rounded-2xl object-cover"
                  loading="lazy"
                />
                {photo.caption_en && (
                  <figcaption className="mt-1 text-center text-sm text-muted">
                    {photo.caption_en}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      )}

      {data.address && (
        <section className="space-y-2 rounded-2xl bg-card p-4">
          <h2 className="font-bold">{t("address")}</h2>
          <p>{data.address}</p>
          <CopyButton text={data.address} label={t("copyAddress")} />
        </section>
      )}
      {data.timings && (
        <section className="rounded-2xl bg-card p-4">
          <h2 className="font-bold">{t("timings")}</h2>
          <p>{data.timings}</p>
        </section>
      )}
      {data.phone && (
        <section className="space-y-2 rounded-2xl bg-card p-4">
          <p className="font-display text-2xl font-extrabold">
            <a href={`tel:${data.phone}`}>{data.phone}</a>
          </p>
          <CopyButton text={data.phone} label={t("copyPhone")} />
        </section>
      )}
      <div className="grid gap-3">
        {data.phone && (
          <a href={`tel:${data.phone}`} className={mainButton}>
            {t("callNow")}
          </a>
        )}
        {data.map_link && (
          <a href={data.map_link} target="_blank" rel="noreferrer" className={plainButton}>
            {t("openMap")}
          </a>
        )}
        <Link to="/xerox" className={plainButton}>
          {t("xerox")}
        </Link>
      </div>
    </div>
  );
}
