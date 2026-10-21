import { useState } from "react";
import { Link } from "react-router-dom";
import { LoadError } from "../../components/LoadError";
import { Skeleton } from "../../components/Skeleton";
import { Field, mainButton, Modal, Notice, plainButton, Switch } from "../../components/ui";
import { formatRupees } from "../../lib/money";
import { supabase } from "../../lib/supabase";
import { useLoad } from "../../lib/useLoad";
import { useTitle } from "../../lib/useTitle";

type Row = {
  id: string;
  name_en: string;
  is_available: boolean;
  is_hidden: boolean;
  categories: { name_en: string };
  product_sizes: { id: string; label: string; price_paise: number; is_default: boolean }[];
};

// State for the price edit modal: which size is being edited.
type PriceEdit = { sizeId: string; sizeLabel: string; productName: string; currentPaise: number };

export function Products() {
  const [search, setSearch] = useState("");
  const [round, setRound] = useState(0);
  const [status, setStatus] = useState<"all" | "finished" | "hidden">("all");
  const [category, setCategory] = useState("");

  // Price edit state
  const [priceEdit, setPriceEdit] = useState<PriceEdit | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [priceMessage, setPriceMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [priceBusy, setPriceBusy] = useState(false);

  const { data, failed, retry } = useLoad(async () => {
    // Include size id so we can update the right row.
    const { data: rows, error } = await supabase
      .from("products")
      .select("id,name_en,is_available,is_hidden,categories(name_en),product_sizes(id,label,price_paise,is_default)")
      .order("name_en");
    if (error) throw error;
    return rows as unknown as Row[];
  }, [round]);
  useTitle("Products");

  async function setAvailable(id: string, next: boolean) {
    await supabase.from("products").update({ is_available: next, updated_at: new Date().toISOString() }).eq("id", id);
    setRound((n) => n + 1);
  }

  function openPriceEdit(p: Row) {
    const size = p.product_sizes.find((s) => s.is_default) ?? p.product_sizes[0];
    if (!size) return;
    setPriceEdit({ sizeId: size.id, sizeLabel: size.label, productName: p.name_en, currentPaise: size.price_paise });
    // Pre-fill with the current price rounded to 2 dp.
    setPriceInput((size.price_paise / 100).toFixed(2));
    setPriceMessage(null);
  }

  function closePriceModal() {
    setPriceEdit(null);
    setPriceInput("");
    setPriceMessage(null);
  }

  async function savePrice() {
    if (!priceEdit) return;

    // Validate: positive number, max 2 decimal places, max 99999.99
    const num = parseFloat(priceInput);
    if (
      isNaN(num) ||
      num <= 0 ||
      num > 99999.99 ||
      !/^\d+(\.\d{1,2})?$/.test(priceInput.trim())
    ) {
      setPriceMessage({ kind: "error", text: "Please enter a valid price between ₹0.01 and ₹99,999.99 with at most 2 decimal places." });
      return;
    }

    setPriceBusy(true);
    const newPaise = Math.round(num * 100);
    const { error } = await supabase
      .from("product_sizes")
      .update({ price_paise: newPaise })
      .eq("id", priceEdit.sizeId);
    setPriceBusy(false);

    if (error) {
      setPriceMessage({ kind: "error", text: "Could not save the price. Please try again." });
    } else {
      setPriceMessage({ kind: "success", text: `Price updated to ${formatRupees(newPaise)}.` });
      // Refresh the list after a short pause so the user sees the notice.
      setTimeout(() => {
        closePriceModal();
        setRound((n) => n + 1);
      }, 1200);
    }
  }

  if (failed) return <LoadError onRetry={retry} />;
  if (!data) return <Skeleton className="h-64" />;

  const categoryNames = [...new Set(data.map((p) => p.categories.name_en))];
  const shown = data.filter(
    (p) =>
      p.name_en.toLowerCase().includes(search.toLowerCase()) &&
      (category === "" || p.categories.name_en === category) &&
      (status === "all" || (status === "finished" ? !p.is_available : p.is_hidden))
  );

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold">Products</h1>

      <input
        className="min-h-12 w-full rounded-xl border-2 border-line bg-card px-3"
        placeholder="Search products"
        aria-label="Search products"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3">
        <select
          aria-label="Category"
          className="min-h-12 rounded-xl border-2 border-line bg-card px-3"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categoryNames.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>

        <select
          aria-label="Status"
          className="min-h-12 rounded-xl border-2 border-line bg-card px-3"
          value={status}
          onChange={(e) => setStatus(e.target.value as "all" | "finished" | "hidden")}
        >
          <option value="all">All items</option>
          <option value="finished">Finished</option>
          <option value="hidden">Hidden</option>
        </select>
      </div>

      <Link to="/owner/products/new" className={`${mainButton} w-full`}>
        Add Product
      </Link>

      <ul>
        {shown.map((p) => {
          const size = p.product_sizes.find((s) => s.is_default) ?? p.product_sizes[0];
          return (
            <li
              key={p.id}
              className={`flex items-center gap-3 border-b border-line py-3 ${p.is_hidden ? "opacity-50" : ""}`}
            >
              <Link to={`/owner/products/${p.id}`} className="flex-1">
                <b>{p.name_en}</b>
                {p.is_hidden && " (hidden)"}
                <br />
                <span className="text-sm">
                  {p.categories.name_en}
                  {size ? ` · ${formatRupees(size.price_paise)} / ${size.label}` : ""}
                </span>
              </Link>

              {/* Edit Price button — only shown when the product has at least one size */}
              {size && (
                <button
                  id={`edit-price-${p.id}`}
                  aria-label={`Edit price for ${p.name_en}`}
                  className={`${plainButton} min-h-14 px-3 text-sm`}
                  onClick={() => openPriceEdit(p)}
                >
                  Edit Price
                </button>
              )}

              <Switch
                on={p.is_available}
                onChange={(next) => setAvailable(p.id, next)}
                label={`${p.name_en} available`}
              />
            </li>
          );
        })}
      </ul>

      {/* Price edit modal */}
      {priceEdit && (
        <Modal
          title={`Edit Price: ${priceEdit.productName}`}
          confirmText={priceBusy ? "Saving..." : "Save Price"}
          onCancel={closePriceModal}
          onConfirm={savePrice}
          busy={priceBusy}
        >
          <p className="text-sm text-muted">
            Size: <b>{priceEdit.sizeLabel}</b> — current price: <b>{formatRupees(priceEdit.currentPaise)}</b>
          </p>
          {priceMessage && (
            <Notice kind={priceMessage.kind}>{priceMessage.text}</Notice>
          )}
          <Field
            id="price-edit-input"
            label="New price (rupees)"
            inputMode="decimal"
            value={priceInput}
            onChange={(e) => {
              setPriceMessage(null);
              setPriceInput(e.target.value);
            }}
            autoFocus
          />
        </Modal>
      )}
    </div>
  );
}
