import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plane, MapPin, Calendar, Users, Search, ArrowRight, ChevronRight,
  Luggage, Utensils, Coffee, Star, Shield, Check, CreditCard,
  QrCode, ChevronDown, ChevronLeft, X, Plus, Minus, ArrowLeftRight,
  Armchair, Info, Tag, AlertCircle, ScanLine, Camera, ChevronUp,
  Sun, Moon,
} from "lucide-react";
import jsQR from "jsqr";

interface Passengers { adults: number; children: number; infants: number; }
interface PassengerDetail {
  salutation: string; firstName: string; lastName: string;
  dobDay: string; dobMonth: string; dobYear: string;
  email: string; phone: string; gender: string; nationality: string;
  docType: string; docNumber: string; docCountry: string;
  docExpDay: string; docExpMonth: string; docExpYear: string;
  ffProgram: string; ffNumber: string; seat: string;
}
interface ContactPerson { name: string; phone: string; email: string; }
interface BookingState {
  tripType: "oneway" | "roundtrip";
  origin: string; destination: string;
  departDate: string; returnDate: string;
  passengers: Passengers; promoCode: string;
  fareClass: string; flightCode: string;
  contact: ContactPerson;
  passengerDetails: PassengerDetail[];
  baseFare: number; taxFee: number; ancillaryFee: number; totalPrice: number;
  selectedAddOns: string[];
}

const emptyPax = (): PassengerDetail => ({
  salutation: "", firstName: "", lastName: "",
  dobDay: "", dobMonth: "", dobYear: "",
  email: "", phone: "", gender: "", nationality: "",
  docType: "", docNumber: "", docCountry: "",
  docExpDay: "", docExpMonth: "", docExpYear: "",
  ffProgram: "", ffNumber: "", seat: "",
});

const INIT: BookingState = {
  tripType: "oneway", origin: "", destination: "", departDate: "", returnDate: "",
  passengers: { adults: 1, children: 0, infants: 0 }, promoCode: "",
  fareClass: "", flightCode: "",
  contact: { name: "", phone: "", email: "" },
  passengerDetails: [emptyPax()],
  baseFare: 0, taxFee: 120, ancillaryFee: 0, totalPrice: 0, selectedAddOns: [],
};

const CITIES = [
  { code: "HAN", name: "Hà Nội",    airport: "Nội Bài International" },
  { code: "SGN", name: "TP.HCM",    airport: "Tân Sơn Nhất International" },
  { code: "DAD", name: "Đà Nẵng",   airport: "Đà Nẵng International" },
  { code: "PQC", name: "Phú Quốc",  airport: "Phú Quốc International" },
  { code: "CXR", name: "Nha Trang", airport: "Cam Ranh International" },
];
const FLIGHTS = [
  { code: "VU751", dep: "08:35", arr: "10:50", dur: "2h15m", base: 38, airline: "Vietravel Airlines", logoCode: "VU" },
  { code: "VU775", dep: "09:55", arr: "12:10", dur: "2h15m", base: 50, airline: "Vietravel Airlines", logoCode: "VU" },
  { code: "VU152", dep: "11:20", arr: "13:35", dur: "2h15m", base: 58, airline: "Vietravel Airlines", logoCode: "VU" },
  { code: "VU213", dep: "13:00", arr: "15:15", dur: "2h15m", base: 72, airline: "Vietravel Airlines", logoCode: "VU" },
  { code: "VU803", dep: "14:20", arr: "16:35", dur: "2h15m", base: 45, airline: "Vietravel Airlines", logoCode: "VU" },
  { code: "VU128", dep: "16:40", arr: "18:55", dur: "2h15m", base: 42, airline: "Vietravel Airlines", logoCode: "VU" }
];
const FARE_CLASSES = [
  { id: "economy",  label: "Phổ thông",  labelEn: "Economy",         mult: 1,    accent: "#64748b",
    perks: ["7kg xách tay", "Không bao gồm hành lý ký gửi", "Chọn ghế tiêu chuẩn", "Phí đổi vé: $30"],
    baggage: { cabin: "7kg", checked: "Không bao gồm", extra: "Mua thêm từ $10/kiện" } },
  { id: "premium",  label: "Phổ thông+", labelEn: "Economy Premium", mult: 1.35, accent: "#3b82f6",
    perks: ["7kg xách tay", "20kg hành lý ký gửi", "Chọn ghế ưu tiên", "Hoàn vé linh hoạt"],
    baggage: { cabin: "7kg", checked: "20kg (1 kiện)", extra: "Mua thêm từ $8/kiện" } },
  { id: "business", label: "Thương gia", labelEn: "Business",        mult: 2.2,  accent: "#f59e0b",
    perks: ["10kg xách tay", "30kg hành lý ký gửi", "Ghế rộng rãi hạng thương gia", "Phòng chờ VIP", "Bữa ăn cao cấp", "Hoàn vé miễn phí"],
    baggage: { cabin: "10kg", checked: "30kg (2 kiện)", extra: "Mua thêm miễn phí" } },
];
const ADD_ONS = [
  { id: "baggage", label: "Hành lý ký gửi 20kg", price: 10, icon: Luggage,  desc: "Thêm 20kg hành lý ký gửi. Áp dụng cho tất cả hạng vé.", detail: "Giới hạn kích thước: 158cm. Tối đa 32kg/kiện." },
  { id: "meal",    label: "Bữa ăn trên máy bay",  price: 8,  icon: Utensils, desc: "Lựa chọn bữa ăn đặc biệt trước chuyến bay.", detail: "Menu: cơm gà, cơm bò, mì hải sản. Đặt trước 24 giờ." },
  { id: "lounge",  label: "Phòng chờ VIP",         price: 25, icon: Coffee,   desc: "Truy cập phòng chờ sân bay cao cấp.", detail: "Đồ ăn nhẹ, WiFi, khu làm việc, vòi sen. Mở cửa 3 giờ trước bay." },
];
const NATIONALITIES = ["Việt Nam","Hoa Kỳ","Nhật Bản","Hàn Quốc","Trung Quốc","Pháp","Đức","Anh Quốc","Úc","Singapore","Thái Lan","Khác"];
const COUNTRIES = ["Việt Nam","Hoa Kỳ","Nhật Bản","Hàn Quốc","Trung Quốc","Pháp","Đức","Anh Quốc","Úc","Singapore","Thái Lan","Khác"];
const MONTHS_LABEL = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6","Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];
const FF_PROGRAMS = ["Vietravel Miles","Khác"];
const COLS = ["A","B","C","D","E","F"];
const TOTAL_ROWS = 20;
const UNAVAILABLE = new Set(["1A","1C","2B","2F","3D","4A","4E","5B","5C","6F","7A","8B","8D","9C","10E","11A","11F","12B","13D","14C","15A","15E","16B","17D","18A","18C","19F","20B","20D"]);
const MONTHS_VN = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6","Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];
const DAYS_SHORT = ["CN","T2","T3","T4","T5","T6","T7"];

function cn(...c: (string|undefined|false|null)[]) { return c.filter(Boolean).join(" "); }

function SelectField({ label, value, onChange, options, placeholder, required }: { label?: string; value: string; onChange: (v:string)=>void; options: string[]; placeholder?: string; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-slate-500 text-xs font-bold uppercase tracking-wider">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}
      <div className="relative">
        <select value={value} onChange={e=>onChange(e.target.value)} className={cn("w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-all pr-8", value?"text-slate-800":"text-slate-400")}>
          <option value="" disabled hidden>{placeholder||"Chọn..."}</option>
          {options.map(o=><option key={o} value={o} style={{background:"#ffffff", color: "#1e293b"}}>{o}</option>)}
        </select>
        <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type="text", required, mono }: { label?: string; value: string; onChange: (v:string)=>void; placeholder?: string; type?: string; required?: boolean; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-slate-500 text-xs font-bold uppercase tracking-wider">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        className={cn("w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary transition-all text-sm", mono&&"font-mono")}/>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <div className="w-4 h-px bg-slate-200"/>
      <span className="text-slate-500 text-xs font-extrabold uppercase tracking-wider">{children}</span>
    </div>
  );
}

function Modal({ open, onClose, title, children, wide, noHeader }: { open: boolean; onClose: ()=>void; title?: string; children: React.ReactNode; wide?: boolean; noHeader?: boolean }) {
  useEffect(() => { document.body.style.overflow = open?"hidden":""; return ()=>{ document.body.style.overflow=""; }; }, [open]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{fontFamily:"'Inter', sans-serif"}}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
          <motion.div initial={{y:50,opacity:0,scale:0.97}} animate={{y:0,opacity:1,scale:1}} exit={{y:32,opacity:0,scale:0.97}} transition={{type:"spring",stiffness:260,damping:26}}
            className={cn("relative bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl w-full overflow-hidden max-h-[92vh] flex flex-col shadow-2xl",wide?"sm:max-w-3xl":"sm:max-w-md")}>
            {!noHeader && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <h3 className="text-slate-800 font-extrabold text-sm">{title}</h3>
                <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"><X size={14}/></button>
              </div>
            )}
            <div className="overflow-y-auto flex-1">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ZoneDivider({ label, color }: { label: string; color: "amber"|"blue"|"white" }) {
  const cls = color==="amber"?"text-amber-400/36":color==="blue"?"text-blue-400/36":"text-white/18";
  const bar = color==="amber"?"bg-amber-500/14":color==="blue"?"bg-blue-500/14":"bg-white/5";
  return (
    <div className={cn("flex items-center gap-2 my-1.5 text-[8px] font-bold uppercase tracking-widest",cls)}>
      <div className={cn("flex-1 h-px",bar)}/>{label}<div className={cn("flex-1 h-px",bar)}/>
    </div>
  );
}

function SeatModal({ open, onClose, details, onConfirm }: { open: boolean; onClose: () => void; details: PassengerDetail[]; onConfirm: (seats: string[]) => void }) {
  const paxCount = details.length;
  const [localSeats, setLocalSeats] = useState<string[]>(() => details.map(d => d.seat));
  const [activePax, setActivePax] = useState(0);
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLocalSeats(details.map(d => d.seat));
      const f = details.findIndex(d => !d.seat);
      setActivePax(f >= 0 ? f : 0);
    }
  }, [open]);

  function getName(i: number) {
    const d = details[i];
    return (d.firstName || d.lastName) ? `${d.lastName} ${d.firstName}`.trim() : `Hành khách ${i + 1}`;
  }

  function getZone(row: number) {
    return row <= 3 ? "business" : row <= 6 ? "premium" : "economy";
  }

  function click(seat: string) {
    if (UNAVAILABLE.has(seat)) return;
    if (localSeats.some((s, i) => s === seat && i !== activePax)) return;
    const n = [...localSeats];
    if (n[activePax] === seat) {
      n[activePax] = "";
    } else {
      n[activePax] = seat;
      const nx = n.findIndex((s, i) => !s && i !== activePax);
      if (nx >= 0) setTimeout(() => setActivePax(nx), 130);
    }
    setLocalSeats(n);
  }

  function seatCls(seat: string, row: number) {
    if (UNAVAILABLE.has(seat)) return "bg-slate-100 border-slate-200 cursor-not-allowed text-slate-300";
    const op = localSeats.findIndex((s, i) => s === seat && i !== activePax);
    if (op >= 0) return "bg-emerald-50 border-emerald-300 text-emerald-700 cursor-pointer font-bold";
    if (localSeats[activePax] === seat) return "bg-primary text-white border-2 border-accent shadow-[0_0_12px_#EAA135] scale-105 z-10 relative";
    const z = getZone(row);
    if (z === "business") return "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 cursor-pointer";
    if (z === "premium") return "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 cursor-pointer";
    return "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer";
  }

  const allOk = localSeats.slice(0, paxCount).every(Boolean);
  const summary = localSeats.filter(Boolean).join(", ");

  return (
    <Modal open={open} onClose={onClose} wide noHeader>
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-5 py-3.5 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors shrink-0">
            <X size={13} />
          </button>
          <div className="min-w-0">
            <span className="text-slate-400 text-xs">Ghế đã chọn: </span>
            <span className="text-primary font-bold text-sm font-mono">{summary || "—"}</span>
          </div>
        </div>
        <button
          onClick={() => { onConfirm(localSeats); onClose(); }}
          disabled={!allOk}
          className={cn(
            "shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
            allOk ? "bg-primary hover:bg-blue-900 text-white shadow-lg shadow-primary/20" : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
          )}
        >
          Xác nhận {allOk && <Check size={13} />}
        </button>
      </div>
      <div className="p-5">
        <div className="mb-4">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Đang chọn ghế cho:</p>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: paxCount }, (_, i) => {
              const seat = localSeats[i];
              const isAct = activePax === i;
              return (
                <button
                  key={i}
                  onClick={() => setActivePax(i)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all",
                    isAct ? "bg-primary border-primary text-white shadow-md shadow-primary/20" : seat ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0", isAct ? "bg-white/20 text-white" : seat ? "bg-emerald-100" : "bg-slate-200 text-slate-500")}>
                    {i + 1}
                  </span>
                  <span className="max-w-[240px] truncate">{getName(i)}</span>
                  {seat && <span className="font-mono text-xs font-bold ml-1">{seat}</span>}
                  {seat && !isAct && <Check size={10} className="ml-1 text-emerald-600" />}
                </button>
              );
            })}
          </div>
          <p className="text-slate-400 text-[10px] font-medium mt-2">Nhấp vào sơ đồ ghế để chọn. Số trong ghế hiển thị thứ tự hành khách đã được gán.</p>
        </div>
        <div className="flex flex-wrap gap-2.5 mb-5 text-[10px] font-bold text-slate-500">
          {[
            { cls: "bg-slate-50 border border-slate-200", l: "Trống" },
            { cls: "bg-primary border border-primary text-white", l: "Đang chọn" },
            { cls: "bg-emerald-55 border border-emerald-300", l: "Đã gán" },
            { cls: "bg-amber-50 border border-amber-200", l: "Thương gia" },
            { cls: "bg-blue-55 border border-blue-200", l: "Ưu tiên" },
            { cls: "bg-slate-100 border border-slate-200", l: "Đã đặt" }
          ].map(x => (
            <div key={x.l} className="flex items-center gap-1.5">
              <div className={cn("w-4 h-4 rounded-[4px]", x.cls)} />
              <span>{x.l}</span>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <div className="flex items-center gap-1 mb-1.5 pl-7">
            {COLS.map((col, ci) => (
              <div key={col} className={cn("w-9 text-center text-[10px] font-bold text-slate-400", ci === 3 && "ml-5")}>
                {col}
              </div>
            ))}
          </div>
          <div className="flex justify-center mb-3">
            <div className="flex flex-col items-center gap-0.5">
              <Plane size={17} className="text-slate-300 rotate-180" />
              <span className="text-slate-300 text-[8px] font-bold tracking-widest">MŨI MÁY BAY</span>
            </div>
          </div>
          <div className="space-y-1 min-w-[300px]">
            {Array.from({ length: TOTAL_ROWS }, (_, ri) => {
              const row = ri + 1;
              return (
                <div key={row}>
                  {row === 1 && <ZoneDivider label="Hạng thương gia (Business)" color="amber" />}
                  {row === 4 && <ZoneDivider label="Hạng ưu tiên (Premium)" color="blue" />}
                  {row === 7 && <ZoneDivider label="Hạng phổ thông (Economy)" color="white" />}
                  <div className="flex items-center gap-1">
                    <div className="w-6 text-[10px] text-slate-400 text-right pr-2 font-mono font-bold">{row}</div>
                    {COLS.map((col, ci) => {
                      const seat = `${row}${col}`;
                      const unavail = UNAVAILABLE.has(seat);
                      const op = localSeats.findIndex((s, i) => s === seat && i !== activePax);
                      const isWindow = col === "A" || col === "F";
                      return (
                        <button
                          key={col}
                          onClick={() => click(seat)}
                          disabled={unavail}
                          onMouseEnter={() => !unavail && setHoveredSeat(seat)}
                          onMouseLeave={() => setHoveredSeat(null)}
                          className={cn("relative w-9 h-8 rounded-md border text-[10px] font-bold transition-all duration-100", ci === 3 && "ml-5", seatCls(seat, row))}
                        >
                          {unavail ? "×" : op >= 0 ? String(op + 1) : col}
                          
                          {/* Tooltip Hover Preview */}
                          {hoveredSeat === seat && !unavail && (
                            isWindow ? (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-44 bg-[#001a2e] border border-[#EAA135]/50 rounded-2xl p-3 shadow-2xl z-30 pointer-events-none text-center">
                                <div className="text-[10px] text-[#EAA135] font-extrabold uppercase tracking-wider mb-2">Góc nhìn cửa sổ ({seat})</div>
                                <div className="w-24 h-28 bg-gradient-to-b from-[#1d4ed8] to-[#60a5fa] rounded-full mx-auto relative border-[5px] border-slate-300 overflow-hidden flex items-center justify-center shadow-inner">
                                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-18 h-8 bg-white/30 rounded-full blur-[1px]" />
                                  <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-20 h-9 bg-white/40 rounded-full blur-[1px]" />
                                  <div className="absolute bottom-0 right-0 w-14 h-14 bg-slate-100 border-l-2 border-t-2 border-slate-300" style={{ clipPath: "polygon(0 100%, 100% 0, 100% 100%)" }} />
                                  <div className="absolute bottom-2 right-0 w-11 h-9 bg-slate-200" style={{ clipPath: "polygon(0 100%, 100% 100%, 100% 30%)" }} />
                                  <div className="absolute top-2 left-4 w-6 h-6 rounded-full bg-amber-200/50 blur-[3px]" />
                                </div>
                                <div className="text-[10px] text-white/85 font-bold mt-2 leading-tight">Ghế rộng 46cm<br/>Góc nhìn mây bay</div>
                              </div>
                            ) : (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-40 bg-[#001a2e] border border-blue-500/40 rounded-2xl p-3 shadow-2xl z-30 pointer-events-none text-center">
                                <div className="text-[10px] text-[#EAA135] font-extrabold uppercase tracking-wider mb-2">Hạng ghế ({seat})</div>
                                <div className="text-[10px] text-white/80 space-y-1 text-left font-bold">
                                  <div>• Khoảng cách: 31" (79cm)</div>
                                  <div>• Chiều rộng: 18" (46cm)</div>
                                  <div>• Sạc di động: Có sẵn</div>
                                </div>
                              </div>
                            )
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function AddOnInfoModal({ addon, open, onClose }: { addon: typeof ADD_ONS[0]|null; open: boolean; onClose: ()=>void }) {
  if(!addon) return null;
  const Icon=addon.icon;
  return (
    <Modal open={open} onClose={onClose} title={addon.label}>
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-150 rounded-2xl">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0"><Icon size={18} className="text-primary"/></div>
          <div><div className="text-slate-800 font-extrabold text-sm">{addon.label}</div><div className="text-slate-400 text-xs font-semibold mt-0.5">{addon.desc}</div></div>
        </div>
        <div className="text-slate-600 text-xs leading-relaxed bg-white border border-slate-100 rounded-xl p-4 font-semibold">{addon.detail}</div>
        <p className="text-slate-400 text-xs font-bold">Giá dịch vụ: <span className="text-primary font-black text-base">+${addon.price}</span></p>
      </div>
    </Modal>
  );
}

function BaggagePanel({ fareId }: { fareId: string }) {
  const fc=FARE_CLASSES.find(f=>f.id===fareId);
  if(!fc) return null;
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center gap-1.5">
        <Luggage size={11} className="text-slate-400"/><span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Hành lý bao gồm</span>
      </div>
      <div className="divide-y divide-slate-100">
        {[{label:"Hành lý xách tay",value:fc.baggage.cabin,icon:"🎒"},{label:"Hành lý ký gửi",value:fc.baggage.checked,icon:"🧳"},{label:"Mua thêm",value:fc.baggage.extra,icon:"➕"}].map(row=>(
          <div key={row.label} className="flex items-center justify-between px-4 py-2.5 text-xs">
            <span className="text-slate-550 flex items-center gap-1.5"><span>{row.icon}</span>{row.label}</span>
            <span className={cn("font-extrabold",row.value==="Không bao gồm"?"text-slate-400":"text-slate-800")}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalPicker({ label, value, onChange, placeholder, disabled, onBeforeOpen }: { label: string; value: string; onChange: (v:string)=>void; placeholder?: string; disabled?: boolean; onBeforeOpen?: () => void }) {
  const [open,setOpen]=useState(false);
  const today=new Date();
  const [vy,setVy]=useState(today.getFullYear());
  const [vm,setVm]=useState(today.getMonth());
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{ const h=(e:MouseEvent)=>{ if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false); }; document.addEventListener("mousedown",h); return ()=>document.removeEventListener("mousedown",h); },[]);
  const dim=new Date(vy,vm+1,0).getDate();
  const first=new Date(vy,vm,1).getDay();
  const cells:(number|null)[]=Array(first).fill(null);
  for(let i=1;i<=dim;i++) cells.push(i);
  function pick(d:number){ const dt=new Date(vy,vm,d); const t=new Date(today); [dt,t].forEach(x=>x.setHours(0,0,0,0)); if(dt<t)return; onChange(dt.toLocaleDateString("vi-VN",{day:"2-digit",month:"short",year:"numeric"})); setOpen(false); }
  function dis(d:number){ const dt=new Date(vy,vm,d); dt.setHours(0,0,0,0); const t=new Date(today); t.setHours(0,0,0,0); return dt<t; }
  return (
    <div className={cn("relative", disabled && "opacity-45 pointer-events-none")} ref={ref}>
      <button disabled={disabled} onClick={()=>{ if(onBeforeOpen) onBeforeOpen(); setOpen(o=>!o); }} className="w-full text-left h-[72px] px-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100/40 transition-all cursor-pointer flex items-center gap-3">
        <Calendar size={15} className="text-accent shrink-0"/>
        <div className="flex-1 min-w-0">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-0.5">{label}</div>
          {value ? (
            <div className="text-slate-800 font-extrabold text-sm">{value}</div>
          ) : (
            <div className="text-slate-400 font-medium text-sm">{placeholder || "Chọn ngày"}</div>
          )}
        </div>
        <ChevronDown size={13} className={cn("text-slate-400 transition-transform shrink-0",open&&"rotate-180")}/>
      </button>
      <AnimatePresence>
        {open&&(
          <motion.div initial={{opacity:0,y:-6,scale:0.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-6,scale:0.97}} transition={{duration:0.13}}
            className="absolute z-[100] top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <button onClick={()=>vm===0?(setVm(11),setVy(y=>y-1)):setVm(m=>m-1)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"><ChevronLeft size={13}/></button>
              <span className="text-slate-800 text-sm font-bold">{MONTHS_VN[vm]} {vy}</span>
              <button onClick={()=>vm===11?(setVm(0),setVy(y=>y+1)):setVm(m=>m+1)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"><ChevronRight size={13}/></button>
            </div>
            <div className="grid grid-cols-7 px-3 pt-3 pb-1">{DAYS_SHORT.map(d=><div key={d} className="text-slate-400 text-[10px] text-center font-bold">{d}</div>)}</div>
            <div className="grid grid-cols-7 px-3 pb-3 gap-0.5">
              {cells.map((d,i)=>{
                if(d===null) return <div key={i}/>;
                const isDis = dis(d);
                const dt = new Date(vy, vm, d);
                const dtStr = dt.toLocaleDateString("vi-VN", { day: "2-digit", month: "short", year: "numeric" });
                const isSel = value === dtStr;
                return (
                  <div key={i}>
                    <button
                      disabled={isDis}
                      onClick={()=>pick(d)}
                      className={cn(
                        "w-full aspect-square flex items-center justify-center rounded-lg text-xs font-semibold transition-all cursor-pointer",
                        isDis
                          ? "text-slate-200 cursor-not-allowed"
                          : isSel
                            ? "bg-primary text-white font-bold"
                            : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      {d}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CityDrop({ label, value, onChange, exclude }: { label:string; value:string; onChange:(v:string)=>void; exclude?:string }) {
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  const city=CITIES.find(c=>c.name===value);
  useEffect(()=>{ const h=(e:MouseEvent)=>{ if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false); }; document.addEventListener("mousedown",h); return ()=>document.removeEventListener("mousedown",h); },[]);
  return (
    <div className="relative" ref={ref}>
      <button onClick={()=>setOpen(o=>!o)} className="w-full text-left h-[72px] px-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100/40 transition-all cursor-pointer flex items-center gap-3">
        <MapPin size={15} className="text-accent shrink-0"/>
        <div className="flex-1 min-w-0">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-0.5">{label}</div>
          {city?<div className="flex items-center gap-2"><span className="text-slate-800 font-extrabold text-sm">{city.name}</span><span className="text-accent text-[10px] font-mono font-bold bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20">{city.code}</span></div>:<div className="text-slate-400 font-medium text-sm">Chọn thành phố</div>}
        </div>
        <ChevronDown size={13} className={cn("text-slate-400 transition-transform shrink-0",open&&"rotate-180")}/>
      </button>
      <AnimatePresence>
        {open&&(
          <motion.div initial={{opacity:0,y:-6,scale:0.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-6,scale:0.97}} transition={{duration:0.13}}
            className="absolute z-[100] top-full mt-2 w-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl">
            {CITIES.filter(c=>c.name!==exclude).map(c=>(
              <button key={c.code} onClick={()=>{onChange(c.name);setOpen(false);}} className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer">
                <div><div className="text-slate-800 font-bold text-sm">{c.name}</div><div className="text-slate-400 text-xs font-semibold mt-0.5">{c.airport}</div></div>
                <span className="text-accent font-mono text-xs font-bold bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20">{c.code}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PaxPicker({ value, onChange, className }: { value:Passengers; onChange:(v:Passengers)=>void; className?: string }) {
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  const total=value.adults+value.children+value.infants;
  const label=[value.adults>0&&`${value.adults} Người lớn`,value.children>0&&`${value.children} Trẻ em`,value.infants>0&&`${value.infants} Em bé`].filter(Boolean).join(", ");
  useEffect(()=>{ const h=(e:MouseEvent)=>{ if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false); }; document.addEventListener("mousedown",h); return ()=>document.removeEventListener("mousedown",h); },[]);
  function adj(key:keyof Passengers,d:number){ const n={...value,[key]:Math.max(key==="adults"?1:0,value[key]+d)}; if(n.adults+n.children+n.infants>9||n.infants>n.adults)return; onChange(n); }
  return (
    <div className={cn("relative", className)} ref={ref}>
      <button onClick={()=>setOpen(o=>!o)} className="w-full text-left h-[72px] px-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100/40 transition-all cursor-pointer flex items-center gap-3">
        <Users size={15} className="text-accent shrink-0"/>
        <div className="flex-1 min-w-0"><div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-0.5">Hành khách</div><div className="text-slate-800 font-extrabold text-sm truncate">{label}</div></div>
        <ChevronDown size={13} className={cn("text-slate-400 transition-transform shrink-0",open&&"rotate-180")}/>
      </button>
      <AnimatePresence>
        {open&&(
          <motion.div initial={{opacity:0,y:-6,scale:0.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-6,scale:0.97}} transition={{duration:0.13}}
            className="absolute z-[100] top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 space-y-4">
              {([["adults","Người lớn","Từ 12 tuổi",1],["children","Trẻ em","2 – 11 tuổi",0],["infants","Em bé","Dưới 2 tuổi",0]] as const).map(([k,lbl,sub,min])=>(
                <div key={k} className="flex items-center justify-between gap-4">
                  <div><div className="text-slate-800 text-sm font-bold">{lbl}</div><div className="text-slate-400 text-xs font-semibold mt-0.5">{sub}</div></div>
                  <div className="flex items-center gap-3">
                    <button onClick={()=>adj(k,-1)} disabled={value[k]<=min} className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-650 disabled:opacity-20 hover:border-primary hover:text-primary transition-colors cursor-pointer"><Minus size={12}/></button>
                    <span className="text-slate-800 font-bold w-4 text-center text-sm">{value[k]}</span>
                    <button onClick={()=>adj(k,1)} disabled={total>=9} className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-650 disabled:opacity-20 hover:border-primary hover:text-primary transition-colors cursor-pointer"><Plus size={12}/></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 pb-4"><button onClick={()=>setOpen(false)} className="w-full bg-primary hover:bg-blue-900 text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-md shadow-primary/10 cursor-pointer">Xác nhận</button></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ClassPicker({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  const options = [
    { id: "economy", label: "Phổ thông" },
    { id: "premium", label: "Phổ thông đặc biệt" },
    { id: "business", label: "Thương gia" }
  ];
  
  const current = options.find(o => o.id === value) || options[0];
  
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  
  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left h-[72px] px-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100/40 transition-all cursor-pointer flex items-center gap-3 min-w-[170px]"
      >
        <Armchair size={15} className="text-accent shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-0.5">Hạng ghế</div>
          <div className="text-slate-800 font-extrabold text-sm truncate">{current.label}</div>
        </div>
        <ChevronDown size={13} className={cn("text-slate-400 transition-transform shrink-0", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.13 }}
            className="absolute z-[100] top-full mt-2 w-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl min-w-[180px]"
          >
            <div className="p-2 space-y-1">
              {options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { onChange(opt.id); setOpen(false); }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    opt.id === value
                      ? "bg-primary text-white"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const STEPS = ["Tìm kiếm", "Chọn chuyến", "Chi tiết", "Thanh toán"];

function StepBar({ step }: { step: number }) {
  return (
    <div className="hidden sm:flex items-center gap-0">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
              i < step ? "bg-accent text-white" : i === step ? "bg-primary text-white ring-4 ring-primary/10" : "bg-slate-100 text-slate-400 border border-slate-200"
            )}>
              {i < step ? <Check size={12} /> : i + 1}
            </div>
            <span className={cn("text-[10px] mt-1 font-semibold whitespace-nowrap", i <= step ? "text-primary" : "text-slate-400")}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn("w-12 h-0.5 mx-1 mb-4 transition-all duration-300", i < step ? "bg-accent" : "bg-slate-200")} />
          )}
        </div>
      ))}
    </div>
  );
}

function TopBar({ step, onBack }: { step: number; onBack?: () => void }) {
  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40 shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="flex items-center gap-1.5 text-slate-500 hover:text-primary transition-colors text-sm font-medium group">
              <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              <span>Quay lại</span>
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Plane size={15} className="text-accent rotate-45" />
            </div>
            <span className="text-primary font-bold text-base tracking-wide flex items-center gap-1.5">
              Vietravel <span className="text-accent font-extrabold text-xs tracking-widest uppercase bg-accent/10 px-1.5 py-0.5 rounded">Airlines</span>
            </span>
          </div>
        </div>
        <StepBar step={step} />
      </div>
    </div>
  );
}

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-white border border-slate-200 rounded-2xl shadow-md", className)}>
      {children}
    </div>
  );
}

function getPaxLabel(state: BookingState, idx: number) {
  const { adults, children } = state.passengers;
  if (idx < adults) return `Người lớn${adults > 1 ? " " + (idx + 1) : ""}`;
  if (idx < adults + children) return `Trẻ em${children > 1 ? " " + (idx - adults + 1) : ""}`;
  return `Em bé ${idx - adults - children + 1}`;
}

const DESTINATIONS = [
  { name: "Hà Nội", accommodations: "12,450 chỗ ở", image: "https://live.staticflickr.com/65535/52833047116_38da40b8a7_b.jpg" },
  { name: "Đà Nẵng", accommodations: "8,920 chỗ ở", image: "https://live.staticflickr.com/65535/50000782407_b8a22239ec_b.jpg" },
  { name: "Nha Trang", accommodations: "6,840 chỗ ở", image: "https://live.staticflickr.com/7502/27748842553_57d447d8f7_b.jpg" },
  { name: "Phú Quốc", accommodations: "5,310 chỗ ở", image: "https://live.staticflickr.com/7896/46639263315_dfde78eefc_b.jpg" },
  { name: "TP. Hồ Chí Minh", accommodations: "16,760 chỗ ở", image: "https://live.staticflickr.com/901/40233550605_9f84f99503_b.jpg" }
];

function Homepage({ state, setState, onSearch, onAuth, onRefund, onLookup }: { state: BookingState; setState: (s: Partial<BookingState>) => void; onSearch: () => void; onAuth: (mode: "signin" | "signup") => void; onRefund: () => void; onLookup: () => void }) {
  const [promoInput, setPromoInput] = useState(state.promoCode);
  const [promoApplied, setPromoApplied] = useState(!!state.promoCode);
  const [showPromo, setShowPromo] = useState(false);
  const [activeSearchTab, setActiveSearchTab] = useState("flights");
  const [directOnly, setDirectOnly] = useState(true);

  const ok = state.origin && state.destination && state.departDate && (state.tripType === "oneway" || state.returnDate);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background pb-16 text-slate-800 dark:text-slate-100" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Top Navbar */}
      <nav className="bg-white dark:bg-card border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 py-4 sticky top-0 z-40 shadow-sm text-slate-800 dark:text-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
            <Plane size={18} className="text-accent rotate-45" />
          </div>
          <div>
            <div className="text-primary dark:text-slate-200 font-black text-lg leading-none">Vietravel</div>
            <div className="text-accent text-[9px] font-extrabold tracking-widest">AIRLINES</div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6 text-slate-600 dark:text-slate-350 text-sm font-semibold">
          <button className="text-primary border-b-2 border-primary pb-1 dark:text-accent dark:border-accent">Vé máy bay</button>
          <button onClick={onRefund} className="hover:text-primary dark:hover:text-accent transition-colors cursor-pointer">Đổi lịch & Hoàn vé</button>
          <button onClick={onLookup} className="hover:text-primary dark:hover:text-accent transition-colors cursor-pointer">Tra cứu qua SĐT</button>
        </div>
        <div className="flex items-center gap-3">
          <DarkModeToggle />
          <button onClick={() => onAuth("signin")} className="text-primary hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer">Đăng nhập</button>
          <button onClick={() => onAuth("signup")} className="bg-primary hover:bg-blue-900 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all dark:bg-accent dark:text-primary dark:hover:bg-accent/85 cursor-pointer">Đăng ký</button>
        </div>
      </nav>

      {/* Hero Banner Section */}
      <div className="relative h-[280px] md:h-[340px] flex items-center justify-center overflow-hidden">
        <img src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1800&h=1000&fit=crop&auto=format" alt="Scenery banner" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#003057]/68 via-[#003057]/48 to-slate-50" />
        <div className="relative z-10 text-center px-4 max-w-2xl">
          <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-2">Thế giới rộng lớn, Bay dễ dàng</h1>
          <p className="text-white/80 text-sm md:text-base">Mở lối hành trình cùng điểm chạm số hiện đại bậc nhất của Vietravel Airlines</p>
        </div>
      </div>

      {/* Search Widget Container (Traveloka style) */}
      <div className="max-w-6xl mx-auto px-6 -mt-16 relative z-20">
        <GlassCard className="p-6 overflow-visible">
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-slate-800 dark:text-slate-100 font-extrabold text-base">
              Đặt vé máy bay trực tuyến
            </h2>
            <button 
              onClick={onLookup}
              className="text-xs text-primary dark:text-accent font-extrabold hover:underline cursor-pointer flex items-center gap-1.5"
            >
              <span>🔍</span> Tra cứu vé đã đặt qua SĐT
            </button>
          </div>

          {/* Controls row */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              {(["oneway", "roundtrip"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setState({ tripType: t, returnDate: "" })}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                    t === state.tripType ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-primary"
                  )}
                >
                  {t === "oneway" ? "Một chiều" : "Khứ hồi"}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
              <label className="flex items-center gap-2 cursor-pointer mr-2">
                <input
                  type="checkbox"
                  checked={directOnly}
                  onChange={e => setDirectOnly(e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                />
                <span>Chỉ bay thẳng</span>
              </label>

              <PaxPicker
                value={state.passengers}
                onChange={p => {
                  const t = p.adults + p.children;
                  setState({ passengers: p, passengerDetails: Array(t).fill(null).map(() => emptyPax()) });
                }}
                className="w-56"
              />

              <ClassPicker
                value={state.fareClass || "economy"}
                onChange={v => setState({ fareClass: v })}
                className="w-56"
              />
            </div>
          </div>

          {/* Input Grid (From, To, Depart Date, Return Date, Search Button) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
            <div className="lg:col-span-3">
              <CityDrop label="Từ" value={state.origin} onChange={v => setState({ origin: v })} exclude={state.destination} />
            </div>
            <div className="relative flex justify-center lg:col-span-1 lg:h-[72px] lg:items-center">
              <button
                onClick={() => setState({ origin: state.destination, destination: state.origin })}
                className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center hover:bg-slate-50 transition-all shadow-md active:scale-95 z-10 cursor-pointer"
              >
                <ArrowLeftRight size={14} className="text-primary rotate-90 lg:rotate-0" />
              </button>
            </div>
            <div className="lg:col-span-3">
              <CityDrop label="Đến" value={state.destination} onChange={v => setState({ destination: v })} exclude={state.origin} />
            </div>
            <div className="lg:col-span-2">
              <CalPicker label="Ngày đi" value={state.departDate} onChange={v => setState({ departDate: v })} />
            </div>
            <div className="lg:col-span-2">
              <CalPicker
                label="Ngày về"
                value={state.tripType === "roundtrip" ? state.returnDate : ""}
                onChange={v => setState({ returnDate: v })}
                placeholder="Chọn ngày về"
                disabled={state.tripType !== "roundtrip"}
              />
            </div>
            <div className="lg:col-span-1">
              <button
                onClick={onSearch}
                disabled={!ok}
                className={cn(
                  "w-full h-[72px] rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95 cursor-pointer",
                  ok ? "bg-[#F26722] hover:bg-orange-600 text-white shadow-orange-500/20" : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                )}
              >
                <Search size={20} />
              </button>
            </div>
          </div>

          {/* Promo code area */}
          <div className="mt-5 border-t border-slate-100 pt-4">
            <button
              onClick={() => setShowPromo(v => !v)}
              className="flex items-center gap-2 text-primary hover:text-slate-900 text-xs font-bold transition-colors mb-2"
            >
              <Tag size={13} className="text-accent" />
              <span>{showPromo ? "Ẩn mã khuyến mãi" : "Nhập mã khuyến mãi để nhận ưu đãi"}</span>
              <ChevronDown size={11} className={cn("transition-transform", showPromo && "rotate-180")} />
            </button>
            <AnimatePresence>
              {showPromo && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="flex gap-2 max-w-md">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Nhập mã ví dụ: VTA2026..."
                        value={promoInput}
                        onChange={e => {
                          setPromoInput(e.target.value.toUpperCase());
                          setPromoApplied(false);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary transition-all text-xs font-mono uppercase tracking-wider"
                      />
                      {promoApplied && <Check size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />}
                    </div>
                    <button
                      onClick={() => {
                        if (promoInput.trim()) {
                          setState({ promoCode: promoInput });
                          setPromoApplied(true);
                        }
                      }}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border",
                        promoApplied ? "bg-emerald-55 border-emerald-200 text-emerald-600" : "bg-primary text-white border-primary hover:bg-blue-900"
                      )}
                    >
                      {promoApplied ? "Đã áp dụng" : "Áp dụng"}
                    </button>
                  </div>
                  {promoApplied && (
                    <p className="text-emerald-600 text-xs mt-1 flex items-center gap-1">
                      <Check size={11} /> Mã ưu đãi <span className="font-mono font-bold">{promoInput}</span> đã được ghi nhận giảm 10%
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </GlassCard>
      </div>

      {/* Trusted Banner */}
      <div className="max-w-6xl mx-auto px-6 mt-8 flex flex-col items-center justify-center">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2.5">Được tin tưởng bởi các thành viên & đối tác</span>
        <div className="flex flex-wrap items-center justify-center gap-8 opacity-40 grayscale hover:opacity-72 transition-opacity">
          {["Vietravel Airlines", "T&T Group", "SHB Bank", "Vietravel Tourism"].map(partner => (
            <span key={partner} className="text-slate-800 font-bold text-xs tracking-wider">{partner}</span>
          ))}
        </div>
      </div>

      {/* Discover Section (Traveloka destinations) */}
      <div className="max-w-6xl mx-auto px-6 mt-12">
        <div className="flex items-center gap-2 mb-6">
          <MapPin size={18} className="text-accent" />
          <h2 className="text-slate-800 font-extrabold text-xl">Khám phá Việt Nam cùng Vietravel Airlines</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {DESTINATIONS.map((dest, di) => (
            <motion.div
              key={dest.name}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: di * 0.08 }}
              className="group relative h-64 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer"
            >
              <img src={dest.image} alt={dest.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-white font-extrabold text-base">{dest.name}</h3>
                <p className="text-white/60 text-[10px] font-semibold">{dest.accommodations}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SelectFlight({ state, setState, onNext, onBack }: { state: BookingState; setState: (s: Partial<BookingState>) => void; onNext: () => void; onBack: () => void }) {
  const [selFlight, setSelFlight] = useState(state.flightCode);
  const [selFare, setSelFare] = useState(state.fareClass);
  const [sortBy, setSortBy] = useState<"price" | "duration">("price");
  const [directOnlyFilter, setDirectOnlyFilter] = useState(false);
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>(["VU"]);
  const [selectedTimes, setSelectedTimes] = useState<string[]>(["early", "morning", "afternoon", "evening"]);
  const [isEditingSearch, setIsEditingSearch] = useState(false);
  const ok = state.origin && state.destination && state.departDate && (state.tripType === "oneway" || state.returnDate);

  // Expanded details inside flight cards
  const [expandedDetails, setExpandedDetails] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<"details" | "benefits">("details");

  // Drawer select package
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerFlight, setDrawerFlight] = useState<any>(null);
  const [expandedFareId, setExpandedFareId] = useState<string>("economy");

  const pax = state.passengers.adults + state.passengers.children;

  // Helper to parse duration string (e.g. 2h15m -> 135 mins)
  const parseDuration = (d: string) => {
    const h = d.match(/(\d+)h/);
    const m = d.match(/(\d+)m/);
    const hrs = h ? parseInt(h[1]) : 0;
    const mins = m ? parseInt(m[1]) : 0;
    return hrs * 60 + mins;
  };

  // Modify flights with faked transits and details for filtering
  const richFlights = FLIGHTS.map(fl => {
    const isDirect = fl.code.startsWith("VU") || fl.code === "VN213";
    const depHour = parseInt(fl.dep.split(":")[0]);
    let timeSlot = "morning";
    if (depHour < 6) timeSlot = "early";
    else if (depHour >= 6 && depHour < 12) timeSlot = "morning";
    else if (depHour >= 12 && depHour < 18) timeSlot = "afternoon";
    else timeSlot = "evening";

    return {
      ...fl,
      isDirect,
      transitText: isDirect ? "Bay thẳng" : "1 điểm dừng",
      timeSlot
    };
  });

  // Filter flights
  const filteredFlights = richFlights.filter(fl => {
    if (directOnlyFilter && !fl.isDirect) return false;
    if (!selectedAirlines.includes(fl.logoCode)) return false;
    if (!selectedTimes.includes(fl.timeSlot)) return false;
    return true;
  });

  // Sort flights
  const sortedFlights = [...filteredFlights].sort((a, b) => {
    if (sortBy === "price") {
      return a.base - b.base;
    } else {
      return parseDuration(a.dur) - parseDuration(b.dur);
    }
  });

  const cheapestFlight = [...richFlights].sort((a, b) => a.base - b.base)[0];

  const handleOpenDrawer = (fl: any) => {
    setDrawerFlight(fl);
    setDrawerOpen(true);
  };

  const handleSelectPackage = (flCode: string, fareId: string, basePrice: number) => {
    const actualFarePrice = Math.round(basePrice * (FARE_CLASSES.find(f => f.id === fareId)?.mult ?? 1));
    setState({
      flightCode: flCode,
      fareClass: fareId,
      baseFare: actualFarePrice,
      totalPrice: actualFarePrice + state.taxFee
    });
    setDrawerOpen(false);
    onNext();
  };

  const toggleAirlineFilter = (code: string) => {
    setSelectedAirlines(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const toggleTimeFilter = (slot: string) => {
    setSelectedTimes(prev =>
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background text-slate-800 dark:text-slate-100" style={{ fontFamily: "'Inter', sans-serif" }}>
      <TopBar step={1} onBack={onBack} />

      {isEditingSearch ? (
        <div className="bg-white dark:bg-card border-b border-slate-200 dark:border-slate-800 px-6 py-6 shadow-lg relative z-30 text-slate-800 dark:text-slate-100">
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
              <h3 className="font-extrabold text-sm text-primary dark:text-accent flex items-center gap-2">
                <span>✈️</span> Chỉnh sửa tìm kiếm chuyến bay
              </h3>
              <button 
                onClick={() => setIsEditingSearch(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>

            {/* Controls row */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {(["oneway", "roundtrip"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setState({ tripType: t, returnDate: "" })}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                      t === state.tripType 
                        ? "bg-white dark:bg-[#00223f] text-primary dark:text-accent shadow-sm" 
                        : "text-slate-500 hover:text-primary dark:text-slate-400"
                    )}
                  >
                    {t === "oneway" ? "Một chiều" : "Khứ hồi"}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-350">
                <label className="flex items-center gap-2 cursor-pointer mr-2">
                  <input
                    type="checkbox"
                    checked={directOnlyFilter}
                    onChange={e => setDirectOnlyFilter(e.target.checked)}
                    className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Chỉ bay thẳng</span>
                </label>

                <PaxPicker
                  value={state.passengers}
                  onChange={p => {
                    const t = p.adults + p.children;
                    setState({ passengers: p, passengerDetails: Array(t).fill(null).map(() => emptyPax()) });
                  }}
                  className="w-56"
                />

                <ClassPicker
                  value={state.fareClass || "economy"}
                  onChange={v => setState({ fareClass: v })}
                  className="w-56"
                />
              </div>
            </div>

            {/* Input Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
              <div className="lg:col-span-3">
                <CityDrop label="Từ" value={state.origin} onChange={v => setState({ origin: v })} exclude={state.destination} />
              </div>
              <div className="relative flex justify-center lg:col-span-1 lg:h-[72px] lg:items-center">
                <button
                  onClick={() => setState({ origin: state.destination, destination: state.origin })}
                  className="w-10 h-10 bg-white dark:bg-[#001a2e] border border-slate-200 dark:border-slate-800 rounded-full flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-md active:scale-95 z-10 cursor-pointer"
                >
                  <ArrowLeftRight size={14} className="text-primary dark:text-accent rotate-90 lg:rotate-0" />
                </button>
              </div>
              <div className="lg:col-span-3">
                <CityDrop label="Đến" value={state.destination} onChange={v => setState({ destination: v })} exclude={state.origin} />
              </div>
              <div className="lg:col-span-2">
                <CalPicker label="Ngày đi" value={state.departDate} onChange={v => setState({ departDate: v })} />
              </div>
              <div className="lg:col-span-2">
                <CalPicker
                  label="Ngày về"
                  value={state.tripType === "roundtrip" ? state.returnDate : ""}
                  onChange={v => setState({ returnDate: v })}
                  placeholder="Chọn ngày về"
                  disabled={state.tripType !== "roundtrip"}
                />
              </div>
              <div className="lg:col-span-1">
                <button
                  onClick={() => setIsEditingSearch(false)}
                  disabled={!ok}
                  className={cn(
                    "w-full h-[72px] rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95 cursor-pointer font-bold text-sm",
                    ok ? "bg-[#F26722] hover:bg-orange-600 text-white shadow-orange-500/20" : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  )}
                >
                  Tìm kiếm
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Flight Search Summary Banner */
        <div className="bg-primary text-white border-b border-white/10 px-6 py-3.5 shadow-md">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-extrabold text-base">{state.origin}</span>
              <ArrowLeftRight size={13} className="text-accent shrink-0" />
              <span className="font-extrabold text-base">{state.destination}</span>
              <div className="w-1.5 h-1.5 rounded-full bg-accent/60 shrink-0" />
              <span className="text-white/80 font-medium">{state.departDate}</span>
              {state.tripType === "roundtrip" && state.returnDate && (
                <>
                  <span className="text-white/40">↩</span>
                  <span className="text-white/80 font-medium">{state.returnDate}</span>
                </>
              )}
              <div className="w-1.5 h-1.5 rounded-full bg-accent/60 shrink-0" />
              <span className="text-white/80 font-medium">{pax} hành khách</span>
              <div className="w-1.5 h-1.5 rounded-full bg-accent/60 shrink-0" />
              <span className="text-accent font-bold font-mono text-xs uppercase bg-accent/15 px-2 py-0.5 rounded border border-accent/20">
                {FARE_CLASSES.find(f => f.id === (state.fareClass || "economy"))?.label}
              </span>
            </div>
            <button onClick={() => setIsEditingSearch(true)} className="text-accent hover:text-white text-xs font-bold transition-all border border-accent/30 hover:border-white px-3 py-1.5 rounded-xl cursor-pointer">
              Thay đổi tìm kiếm
            </button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-7 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Sidebar Filters (Traveloka Style) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Your Flight Card */}
          <GlassCard className="p-4">
            <h3 className="text-slate-800 font-extrabold text-sm border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
              <span>✈️</span> Chuyến bay của bạn
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0 text-[10px]">1</div>
                <div>
                  <div className="font-extrabold text-slate-800">{state.origin} → {state.destination}</div>
                  <div className="text-slate-500 font-semibold mt-0.5">{state.departDate}</div>
                </div>
              </div>
              {state.tripType === "roundtrip" && state.returnDate && (
                <div className="flex items-start gap-3 border-t border-slate-100 pt-3">
                  <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold shrink-0 text-[10px]">2</div>
                  <div>
                    <div className="font-extrabold text-slate-800">{state.destination} → {state.origin}</div>
                    <div className="text-slate-500 font-semibold mt-0.5">{state.returnDate}</div>
                  </div>
                </div>
              )}
              <div className="bg-slate-50 p-2.5 rounded-xl text-slate-500 font-semibold border border-slate-100 flex justify-between items-center">
                <span>Số lượng hành khách:</span>
                <span className="text-slate-800 font-bold">{pax}</span>
              </div>
            </div>
          </GlassCard>

          {/* Filters Card */}
          <GlassCard className="p-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-4">
              <h3 className="text-slate-800 font-extrabold text-sm">
                Bộ lọc tìm kiếm
              </h3>
              <button 
                onClick={() => { setDirectOnlyFilter(false); setSelectedAirlines(["VU"]); setSelectedTimes(["early", "morning", "afternoon", "evening"]); }}
                className="text-primary hover:text-blue-900 text-xs font-bold"
              >
                Đặt lại
              </button>
            </div>

            {/* Stops Filter */}
            <div className="space-y-2 border-b border-slate-100 pb-4 mb-4">
              <div className="text-slate-700 font-bold text-xs uppercase tracking-wider">Số điểm dừng</div>
              <label className="flex items-center gap-3 text-xs text-slate-600 font-semibold cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={directOnlyFilter}
                  onChange={e => setDirectOnlyFilter(e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                />
                <span>Bay thẳng (Direct)</span>
              </label>
            </div>

            {/* Times Filter */}
            <div className="space-y-2">
              <div className="text-slate-700 font-bold text-xs uppercase tracking-wider">Khung giờ cất cánh</div>
              <div className="space-y-2.5">
                {[
                  { id: "early", label: "Sáng sớm (00:00 - 06:00)" },
                  { id: "morning", label: "Buổi sáng (06:00 - 12:00)" },
                  { id: "afternoon", label: "Buổi chiều (12:00 - 18:00)" },
                  { id: "evening", label: "Buổi tối (18:00 - 24:00)" }
                ].map(time => (
                  <label key={time.id} className="flex items-center gap-3 text-xs text-slate-600 font-semibold cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={selectedTimes.includes(time.id)}
                      onChange={() => toggleTimeFilter(time.id)}
                      className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>{time.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Flight List */}
        <div className="lg:col-span-8 space-y-4">
          {/* Sorting panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Sắp xếp theo:</span>
            <div className="flex gap-2">
              {[
                { id: "price", label: "Giá thấp nhất ↓" },
                { id: "duration", label: "Thời gian bay ngắn nhất ↓" }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSortBy(opt.id as any)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold transition-all border",
                    sortBy === opt.id 
                      ? "bg-primary border-primary text-white" 
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-card dark:border-slate-800 dark:text-slate-350 dark:hover:bg-slate-800"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cheap highlight banner */}
          {cheapestFlight && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 text-lg shrink-0">🏷️</div>
                <div>
                  <h4 className="text-emerald-800 font-extrabold text-xs uppercase tracking-wider">Chuyến bay giá tốt nhất</h4>
                  <p className="text-slate-500 text-xs mt-0.5">Đặt ngay chuyến bay {cheapestFlight.code} của {cheapestFlight.airline} chỉ từ <span className="text-emerald-600 font-bold">${cheapestFlight.base}</span></p>
                </div>
              </div>
              <button onClick={() => handleOpenDrawer(cheapestFlight)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all shrink-0">Đặt ngay</button>
            </div>
          )}

          {/* Flights list */}
          <div className="space-y-3.5">
            {sortedFlights.length === 0 ? (
              <GlassCard className="p-8 text-center text-slate-400 font-medium">
                📭 Không tìm thấy chuyến bay nào khớp với bộ lọc của bạn.
              </GlassCard>
            ) : (
              sortedFlights.map((fl, i) => {
                const showDetails = expandedDetails === fl.code;
                return (
                  <motion.div
                    key={fl.code}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden"
                  >
                    {/* Main card info */}
                    <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      {/* Left: Airline info & Time */}
                      <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-6">
                        {/* Airline logocode & name */}
                        <div className="w-40 shrink-0 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-accent font-extrabold text-[11px] shrink-0 shadow-sm bg-primary">
                            VU
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-800 text-xs">{fl.airline}</div>
                            <div className="text-[10px] text-slate-400 font-bold font-mono tracking-wide">{fl.code}</div>
                          </div>
                        </div>

                        {/* Route Timeline */}
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="text-slate-800 text-lg font-black font-mono leading-none">{fl.dep}</div>
                            <div className="text-slate-400 font-bold text-[10px] uppercase text-center mt-1">{CITIES.find(c => c.name === state.origin)?.code}</div>
                          </div>
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="text-slate-400 font-bold text-[9px]">{fl.dur}</div>
                            <div className="flex items-center gap-1.5 w-16">
                              <div className="flex-1 h-[2px] bg-slate-200" />
                              <Plane size={11} className="text-primary rotate-90 shrink-0" />
                              <div className="flex-1 h-[2px] bg-slate-200" />
                            </div>
                            <div className={cn("text-[9px] font-bold uppercase tracking-wider", fl.isDirect ? "text-slate-400" : "text-amber-500")}>
                              {fl.transitText}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-800 text-lg font-black font-mono leading-none">{fl.arr}</div>
                            <div className="text-slate-400 font-bold text-[10px] uppercase text-center mt-1">{CITIES.find(c => c.name === state.destination)?.code}</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Amenities, Price & Button */}
                      <div className="shrink-0 flex items-center justify-between sm:justify-end gap-6 border-t border-slate-100 pt-4 sm:border-transparent sm:pt-0">
                        {/* Amenities */}
                        <div className="flex items-center gap-3 text-slate-400">
                          <span title="Hành lý miễn cước 15kg">💼 15kg</span>
                          <span title="Dịch vụ giải trí">📶 Wifi</span>
                        </div>

                        {/* Price & Action */}
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <div className="text-slate-400 text-[10px] font-semibold">Giá vé từ</div>
                            <div className="text-primary text-xl font-extrabold">${fl.base}</div>
                            <div className="text-slate-400 text-[9px] font-bold">/ hành khách</div>
                          </div>
                          <button
                            onClick={() => handleOpenDrawer(fl)}
                            className="bg-primary hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all"
                          >
                            Chọn
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions bar */}
                    <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
                      <button
                        onClick={() => {
                          if (showDetails && activeDetailTab === "details") {
                            setExpandedDetails(null);
                          } else {
                            setExpandedDetails(fl.code);
                            setActiveDetailTab("details");
                          }
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-lg border transition-all cursor-pointer font-bold text-xs",
                          showDetails && activeDetailTab === "details"
                            ? "bg-primary dark:bg-accent text-white dark:text-primary border-primary dark:border-accent shadow-sm"
                            : "bg-blue-50/70 hover:bg-blue-100/90 dark:bg-[#00223f] dark:hover:bg-slate-800 text-[#004b87] dark:text-[#EAA135] border-blue-200/60 dark:border-[#EAA135]/30 hover:text-blue-900"
                        )}
                      >
                        Chi tiết chuyến bay
                      </button>
                      <button
                        onClick={() => {
                          if (showDetails && activeDetailTab === "benefits") {
                            setExpandedDetails(null);
                          } else {
                            setExpandedDetails(fl.code);
                            setActiveDetailTab("benefits");
                          }
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-lg border transition-all cursor-pointer font-bold text-xs",
                          showDetails && activeDetailTab === "benefits"
                            ? "bg-primary dark:bg-accent text-white dark:text-primary border-primary dark:border-accent shadow-sm"
                            : "bg-blue-50/70 hover:bg-blue-100/90 dark:bg-[#00223f] dark:hover:bg-slate-800 text-[#004b87] dark:text-[#EAA135] border-blue-200/60 dark:border-[#EAA135]/30 hover:text-blue-900"
                        )}
                      >
                        Quyền lợi vé
                      </button>
                      <span className="text-emerald-600 ml-2">✓ Có thể hoàn vé</span>
                      <span className="text-emerald-600">✓ Có thể đổi lịch</span>
                    </div>

                    {/* Expanded details container */}
                    <AnimatePresence>
                      {showDetails && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-slate-100 bg-slate-50/50"
                        >
                          <div className="p-5 border-t border-slate-100">
                            {activeDetailTab === "details" ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600">
                                <div className="space-y-4">
                                  <div className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">Lộ trình chi tiết</div>
                                  <div className="relative pl-6 border-l-2 border-slate-200 space-y-5">
                                    <div className="relative">
                                      <div className="absolute -left-[29px] top-0 w-3.5 h-3.5 rounded-full bg-primary border-4 border-white shadow-sm" />
                                      <div className="font-bold text-slate-800">{fl.dep} — Sân bay {CITIES.find(c => c.name === state.origin)?.name} ({CITIES.find(c => c.name === state.origin)?.code})</div>
                                      <div className="text-slate-400 font-semibold mt-0.5">Nhà ga hành khách T1</div>
                                    </div>
                                    <div className="py-1 bg-slate-100/80 px-3 rounded-xl border border-slate-200/60 flex items-center gap-3">
                                      <span className="font-bold text-primary">{fl.airline} ({fl.code})</span>
                                      <span className="text-slate-400">|</span>
                                      <span>Máy bay Airbus A321 (3-3)</span>
                                    </div>
                                    <div className="relative">
                                      <div className="absolute -left-[29px] top-0 w-3.5 h-3.5 rounded-full bg-accent border-4 border-white shadow-sm" />
                                      <div className="font-bold text-slate-800">{fl.arr} — Sân bay {CITIES.find(c => c.name === state.destination)?.name} ({CITIES.find(c => c.name === state.destination)?.code})</div>
                                      <div className="text-slate-400 font-semibold mt-0.5">Nhà ga hành khách T2</div>
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-4">
                                  <div className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">Tiện ích khoang máy</div>
                                  <div className="grid grid-cols-2 gap-3.5">
                                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-start gap-2.5">
                                      <span className="text-lg">💼</span>
                                      <div>
                                        <div className="font-bold text-slate-800">Hành lý</div>
                                        <div className="text-slate-400 font-semibold mt-0.5">Xách tay 7kg, Ký gửi 15kg</div>
                                      </div>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-start gap-2.5">
                                      <span className="text-lg">🍱</span>
                                      <div>
                                        <div className="font-bold text-slate-800">Suất ăn</div>
                                        <div className="text-slate-400 font-semibold mt-0.5">Mua trước suất ăn hoặc mua trên cabin</div>
                                      </div>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-start gap-2.5">
                                      <span className="text-lg">📶</span>
                                      <div>
                                        <div className="font-bold text-slate-800">Kết nối</div>
                                        <div className="text-slate-400 font-semibold mt-0.5">Có sẵn cổng sạc & mua gói Wifi</div>
                                      </div>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-start gap-2.5">
                                      <span className="text-lg">🛋️</span>
                                      <div>
                                        <div className="font-bold text-slate-800">Ghế ngồi</div>
                                        <div className="text-slate-400 font-semibold mt-0.5">Độ rộng ghế 29-30 inches tiêu chuẩn</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-4 text-xs text-slate-600">
                                <div className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px] mb-2">Quyền lợi vé & Điều kiện hoàn hủy</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                                    <h4 className="text-emerald-700 font-extrabold flex items-center gap-1.5">
                                      <span>✓</span> Có thể hoàn vé
                                    </h4>
                                    <p className="text-slate-500 font-medium leading-relaxed">Có thể hoàn vé bằng hình thức tiền mặt hoặc thẻ điểm với mức phí từ $10/hành khách. Yêu cầu gửi tối thiểu 24 tiếng trước giờ khởi hành.</p>
                                  </div>
                                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                                    <h4 className="text-emerald-700 font-extrabold flex items-center gap-1.5">
                                      <span>✓</span> Có thể đổi lịch (Reschedule)
                                    </h4>
                                    <p className="text-slate-500 font-medium leading-relaxed">Đổi ngày/giờ bay miễn phí chênh lệch giá vé (chỉ thu phí chênh lệch nếu vé ngày mới cao hơn). Hạn chót thực hiện là 12 tiếng trước giờ khởi hành.</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Ticket Type Drawer (Traveloka Style Center Modal / Side Sheet Overlay) */}
      <AnimatePresence>
        {drawerOpen && drawerFlight && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 50, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-slate-800 font-black text-base">Chọn gói hạng vé (Chiều đi)</h3>
                  <p className="text-slate-400 text-xs font-semibold mt-0.5">
                    Chuyến bay {drawerFlight.code} · {drawerFlight.airline} · {state.origin} → {state.destination}
                  </p>
                </div>
                <button 
                  onClick={() => setDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Drawer Content with mobile Accordion styling */}
              <div className="p-6 overflow-y-auto flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-4">
                {FARE_CLASSES.map(fc => {
                  const totalPrice = Math.round(drawerFlight.base * fc.mult);
                  const isExpanded = expandedFareId === fc.id;
                  return (
                    <div 
                      key={fc.id} 
                      className={cn(
                        "border rounded-2xl overflow-hidden flex flex-col bg-white transition-all duration-200 select-none",
                        isExpanded 
                          ? "border-primary dark:border-accent shadow-md ring-1 ring-primary/10 dark:ring-accent/10" 
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 shadow-sm cursor-pointer"
                      )}
                      onClick={() => {
                        if (!isExpanded) setExpandedFareId(fc.id);
                      }}
                    >
                      {/* Mobile Collapsed State */}
                      <div className="md:hidden block">
                        {!isExpanded && (
                          <div className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md" style={{ color: fc.accent, backgroundColor: `${fc.accent}12` }}>
                                {fc.labelEn}
                              </span>
                              <h4 className="text-slate-800 dark:text-slate-100 font-bold text-sm">{fc.label}</h4>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-primary dark:text-accent font-black text-sm">${totalPrice}</span>
                              <ChevronDown size={14} className="text-slate-400 dark:text-slate-500" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Full details state (always on desktop, expanded only on mobile) */}
                      <div className={cn(isExpanded ? "block" : "hidden md:flex md:flex-col flex-1")}>
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 text-center" style={{ backgroundColor: `${fc.accent}12` }}>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: fc.accent }}>
                            {fc.labelEn}
                          </span>
                          <h4 className="text-slate-800 dark:text-slate-100 font-black text-lg mt-0.5">{fc.label}</h4>
                        </div>
                        
                        {/* Price box */}
                        <div className="p-4 text-center border-b border-slate-50 dark:border-slate-850">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Giá hành khách</span>
                          <span className="text-primary dark:text-accent text-2xl font-black">${totalPrice}</span>
                          <span className="text-slate-400 dark:text-slate-500 text-[10px] font-semibold block mt-0.5">đã gồm thuế hàng không</span>
                        </div>

                        {/* Perks */}
                        <div className="p-5 flex-1 space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
                          <div className="flex items-start gap-2">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>Bao gồm <b>{fc.baggage.cabin}</b> hành lý xách tay</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>Hành lý ký gửi: <b>{fc.baggage.checked}</b></span>
                          </div>
                          {fc.perks.slice(2).map((perk, pi) => (
                            <div key={pi} className="flex items-start gap-2">
                              <span className="text-emerald-600 font-bold">✓</span>
                              <span>{perk}</span>
                            </div>
                          ))}
                        </div>

                        {/* Select button */}
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-card">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation(); // prevent event bubble trigger
                              handleSelectPackage(drawerFlight.code, fc.id, drawerFlight.base);
                            }}
                            className="w-full bg-primary hover:bg-blue-900 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm dark:bg-accent dark:text-primary dark:hover:bg-accent/85 cursor-pointer"
                          >
                            Chọn gói này
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Flexible date picker (past or future) ────────────────────────────────────

// ─── Flexible date picker (past or future) ────────────────────────────────────
const MONTHS_SHORT = ["Th.1","Th.2","Th.3","Th.4","Th.5","Th.6","Th.7","Th.8","Th.9","Th.10","Th.11","Th.12"];
const DAYS_GRID = ["CN","T2","T3","T4","T5","T6","T7"];

function FlexDatePicker({ label, day, month, year, onDay, onMonth, onYear, required, pastOnly, futureOnly }: {
  label?: string; day: string; month: string; year: string;
  onDay:(v:string)=>void; onMonth:(v:string)=>void; onYear:(v:string)=>void;
  required?: boolean; pastOnly?: boolean; futureOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pickingYear, setPickingYear] = useState(false);
  const today = new Date();
  const initY = year ? parseInt(year) : (pastOnly ? 1990 : today.getFullYear() + 1);
  const initM = month ? Math.max(0, MONTHS_LABEL.indexOf(month)) : (pastOnly ? 0 : today.getMonth());
  const [vy, setVy] = useState(initY);
  const [vm, setVm] = useState(initM);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setPickingYear(false); } };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  // sync view when external value changes (e.g. CCCD scan)
  useEffect(() => {
    if (year) setVy(parseInt(year));
    if (month) { const mi = MONTHS_LABEL.indexOf(month); if (mi >= 0) setVm(mi); }
  }, [year, month]);

  const dim = new Date(vy, vm + 1, 0).getDate();
  const first = new Date(vy, vm, 1).getDay();
  const cells: (number|null)[] = Array(first).fill(null);
  for (let i = 1; i <= dim; i++) cells.push(i);

  function isDisabled(d: number) {
    const dt = new Date(vy, vm, d); dt.setHours(0,0,0,0);
    const t = new Date(today); t.setHours(0,0,0,0);
    if (pastOnly && dt >= t) return true;
    if (futureOnly && dt <= t) return true;
    return false;
  }

  function pickDay(d: number) {
    if (isDisabled(d)) return;
    onDay(String(d).padStart(2,"0")); onMonth(MONTHS_LABEL[vm]); onYear(String(vy));
    setOpen(false); setPickingYear(false);
  }

  const hasDate = !!(day && month && year);
  const monIdx = MONTHS_LABEL.indexOf(month);
  const displayVal = hasDate ? `${day}/${String(monIdx + 1).padStart(2,"0")}/${year}` : "";

  const yearEnd   = pastOnly ? today.getFullYear() : today.getFullYear() + 20;
  const yearStart = pastOnly ? today.getFullYear() - 100 : today.getFullYear();
  const yearRange = Array.from({length: yearEnd - yearStart + 1}, (_, i) => yearEnd - i);

  return (
    <div className="flex flex-col gap-1.5" ref={ref}>
      {label && (
        <label className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <button onClick={() => { setOpen(o => !o); setPickingYear(false); }}
          className="w-full text-left bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 flex items-center gap-2 hover:border-slate-350 focus:outline-none focus:border-primary transition-all text-sm cursor-pointer shadow-sm">
          <Calendar size={13} className="text-accent shrink-0"/>
          <span className={cn("text-sm flex-1 font-mono", hasDate ? "text-slate-800 dark:text-slate-200" : "text-slate-400 dark:text-slate-500")}>
            {displayVal || "DD/MM/YYYY"}
          </span>
          <ChevronDown size={13} className={cn("text-slate-400 dark:text-slate-500 transition-transform shrink-0", open && "rotate-180")}/>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div initial={{opacity:0,y:-4,scale:0.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-4,scale:0.98}} transition={{duration:0.12}}
              className="absolute z-[150] top-full mt-1 left-0 w-56 bg-white dark:bg-[#001a2e] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xl text-slate-800 dark:text-slate-200">
              {/* Header */}
              <div className="flex items-center justify-between px-2.5 py-2 border-b border-slate-100 dark:border-slate-800">
                <button onClick={() => vm===0?(setVm(11),setVy(y=>y-1)):setVm(m=>m-1)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"><ChevronLeft size={12}/></button>
                <button onClick={() => setPickingYear(v => !v)}
                  className="flex items-center gap-1 text-slate-700 dark:text-slate-200 text-xs font-bold hover:text-[#004b87] dark:hover:text-accent transition-colors">
                  {MONTHS_SHORT[vm]} <span className="font-mono">{vy}</span>
                  <ChevronDown size={10} className={cn("text-slate-400 dark:text-slate-500 transition-transform", pickingYear && "rotate-180")}/>
                </button>
                <button onClick={() => vm===11?(setVm(0),setVy(y=>y+1)):setVm(m=>m+1)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"><ChevronRight size={12}/></button>
              </div>

              {pickingYear ? (
                <div className="grid grid-cols-4 gap-0.5 p-2 max-h-40 overflow-y-auto">
                  {yearRange.map(y => (
                    <button key={y} onClick={() => { setVy(y); setPickingYear(false); }}
                      className={cn("py-1 rounded-md text-[11px] font-semibold transition-all",
                        y === vy ? "bg-primary text-white font-bold" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white")}>
                      {y}
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-7 px-2.5 pt-1.5 pb-0.5">
                    {DAYS_GRID.map(d => <div key={d} className="text-slate-400 dark:text-slate-500 text-[9px] text-center font-bold">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 px-2.5 pb-2.5 gap-px">
                    {cells.map((d,i) => <div key={i}>{d === null ? <div/> :
                      <button onClick={() => pickDay(d)} disabled={isDisabled(d)}
                        className={cn("w-full aspect-square flex items-center justify-center rounded-md text-[11px] font-medium transition-all",
                          isDisabled(d) ? "text-slate-200 dark:text-slate-850 cursor-not-allowed"
                          : day===String(d).padStart(2,"0") && MONTHS_LABEL[vm]===month && String(vy)===year
                            ? "bg-primary text-white font-bold shadow-sm"
                            : "text-slate-700 dark:text-slate-350 hover:bg-primary/20 dark:hover:bg-primary/30 hover:text-primary dark:hover:text-accent cursor-pointer")}>
                        {d}
                      </button>}
                    </div>)}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function handleDownloadPDF(paxName: string, flight: string, seat: string, pnr: string, price: number) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(`
    <html>
      <head>
        <title>Vietravel Airlines E-Ticket - ${pnr}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background-color: #f8fafc; }
          .ticket { border: 2px solid #004b87; border-radius: 16px; padding: 30px; max-width: 600px; margin: 0 auto; background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { text-align: center; border-bottom: 2px solid #f26722; padding-bottom: 20px; margin-bottom: 20px; }
          .logo { font-size: 26px; font-weight: 900; color: #004b87; margin: 0; }
          .logo span { color: #f26722; font-size: 14px; text-transform: uppercase; font-weight: 800; display: block; tracking-widest: 2px; }
          .title { font-size: 16px; font-weight: 800; margin-top: 12px; color: #475569; letter-spacing: 1px; }
          .table-info { width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px; }
          .table-info td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
          .table-info td:first-child { color: #64748b; font-weight: 600; width: 40%; }
          .table-info td:last-child { font-weight: 700; color: #0f172a; }
          .pnr-val { font-family: monospace; font-size: 18px; font-weight: 900 !important; color: #004b87 !important; }
          .footer { text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 20px; font-size: 11px; color: #64748b; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="header">
            <h1 class="logo">Vietravel <span>Airlines</span></h1>
            <div class="title">VÉ ĐIỆN TỬ & XÁC NHẬN HÀNH TRÌNH</div>
          </div>
          <table class="table-info">
            <tr>
              <td>Hành khách:</td>
              <td>${paxName.toUpperCase()}</td>
            </tr>
            <tr>
              <td>Mã đặt chỗ (PNR):</td>
              <td class="pnr-val">${pnr}</td>
            </tr>
            <tr>
              <td>Chuyến bay:</td>
              <td>${flight}</td>
            </tr>
            <tr>
              <td>Ghế ngồi:</td>
              <td>${seat}</td>
            </tr>
            <tr>
              <td>Hạng vé:</td>
              <td>Phổ thông (Economy)</td>
            </tr>
            <tr>
              <td>Tổng thanh toán:</td>
              <td style="color: #f26722; font-size: 16px;">$${price}</td>
            </tr>
            <tr>
              <td>Trạng thái vé:</td>
              <td style="color: #10b981;">ĐÃ XÁC NHẬN (CONFIRMED)</td>
            </tr>
          </table>
          
          <!-- Barcode Generation -->
          <div style="text-align: center; margin-top: 25px; border-top: 1px dashed #cbd5e1; padding-top: 25px;">
            <svg style="width: 320px; height: 60px; margin: 0 auto;" viewBox="0 0 100 20" preserveAspectRatio="none">
              <rect x="0" y="0" width="1.5" height="20" fill="black" />
              <rect x="3" y="0" width="0.5" height="20" fill="black" />
              <rect x="5" y="0" width="2" height="20" fill="black" />
              <rect x="9" y="0" width="1" height="20" fill="black" />
              <rect x="11" y="0" width="0.5" height="20" fill="black" />
              <rect x="13" y="0" width="3" height="20" fill="black" />
              <rect x="18" y="0" width="1.5" height="20" fill="black" />
              <rect x="21" y="0" width="0.5" height="20" fill="black" />
              <rect x="23" y="0" width="2" height="20" fill="black" />
              <rect x="27" y="0" width="1.5" height="20" fill="black" />
              <rect x="30" y="0" width="0.5" height="20" fill="black" />
              <rect x="32" y="0" width="3" height="20" fill="black" />
              <rect x="37" y="0" width="1" height="20" fill="black" />
              <rect x="39" y="0" width="0.5" height="20" fill="black" />
              <rect x="41" y="0" width="2" height="20" fill="black" />
              <rect x="45" y="0" width="1.5" height="20" fill="black" />
              <rect x="48" y="0" width="0.5" height="20" fill="black" />
              <rect x="50" y="0" width="3" height="20" fill="black" />
              <rect x="55" y="0" width="1.5" height="20" fill="black" />
              <rect x="58" y="0" width="0.5" height="20" fill="black" />
              <rect x="60" y="0" width="2" height="20" fill="black" />
              <rect x="64" y="0" width="1" height="20" fill="black" />
              <rect x="66" y="0" width="0.5" height="20" fill="black" />
              <rect x="68" y="0" width="3" height="20" fill="black" />
              <rect x="73" y="0" width="1.5" height="20" fill="black" />
              <rect x="76" y="0" width="0.5" height="20" fill="black" />
              <rect x="78" y="0" width="2" height="20" fill="black" />
              <rect x="82" y="0" width="1" height="20" fill="black" />
              <rect x="84" y="0" width="0.5" height="20" fill="black" />
              <rect x="86" y="0" width="3" height="20" fill="black" />
              <rect x="91" y="0" width="1.5" height="20" fill="black" />
              <rect x="94" y="0" width="0.5" height="20" fill="black" />
              <rect x="96" y="0" width="4" height="20" fill="black" />
            </svg>
            <div style="font-family: monospace; font-size: 11px; color: #64748b; letter-spacing: 4px; margin-top: 5px; font-weight: bold;">*${pnr}*</div>
          </div>

          <div class="footer">
            <p>Cảm ơn quý khách đã tin tưởng lựa chọn Vietravel Airlines!</p>
            <p>Vui lòng xuất trình vé điện tử này cùng giấy tờ tùy thân hợp lệ khi làm thủ tục tại sân bay.</p>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

// ─── CCCD QR Scanner ──────────────────────────────────────────────────────────
interface CCCDData {
  lastName: string; firstName: string;
  dob: { day: string; month: string; year: string };
  gender: string; nationality: string;
  docNumber: string; docExpiry: { day: string; month: string; year: string };
}

function parseCCCD(raw: string): CCCDData | null {
  const parts = raw.split("|");
  if (parts.length < 5) return null;

  // Format: [ID]|[Old ID or empty]|[Full name]|[DOB ddmmyyyy]|[Gender]|[Nationality]|[Country]|[Address]|[Expiry ddmmyyyy]
  // Or standard 7-field format: [ID]|[Old ID or empty]|[Full name]|[DOB ddmmyyyy]|[Gender]|[Address]|[Issue date]
  let id = "", name = "", dobRaw = "", genderRaw = "", nat = "Việt Nam", expRaw = "";

  if (parts.length >= 7 && /^\d{12}$/.test(parts[0]) && (/^\d{9}$/.test(parts[1]) || parts[1] === "")) {
    // Standard 7-field chip CCCD format
    id = parts[0];
    name = parts[2];
    dobRaw = parts[3];
    genderRaw = parts[4];
    if (parts.length >= 9) {
      expRaw = parts[8];
    }
  } else if (parts.length >= 9) {
    // New chip CCCD format
    id = parts[0];
    name = parts[2];
    dobRaw = parts[3];
    genderRaw = parts[4];
    nat = parts[5] || "Việt Nam";
    expRaw = parts[8];
  } else if (parts.length >= 6) {
    // If parts[1] is a number (old ID), then name is parts[2]
    if (/^\d+$/.test(parts[1])) {
      id = parts[0];
      name = parts[2];
      dobRaw = parts[3];
      genderRaw = parts[4];
      expRaw = parts[parts.length - 1];
    } else {
      id = parts[0];
      name = parts[1];
      dobRaw = parts[2];
      genderRaw = parts[3];
      expRaw = parts[parts.length - 1];
    }
  } else {
    id = parts[0];
    name = parts[1];
    dobRaw = parts[2];
    genderRaw = parts[3];
  }

  // Parse date ddmmyyyy or dd/mm/yyyy or yyyy-mm-dd
  function parseDate(s: string) {
    if (!s) return { day: "", month: "", year: "" };
    // Check if it matches YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const dateParts = s.split("-");
      const yr = dateParts[0], mon = dateParts[1], day = dateParts[2];
      return { day, month: MONTHS_LABEL[parseInt(mon, 10)-1] || "", year: yr };
    }
    // Check if it matches DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const dateParts = s.split("/");
      const day = dateParts[0], mon = dateParts[1], yr = dateParts[2];
      return { day, month: MONTHS_LABEL[parseInt(mon, 10)-1] || "", year: yr };
    }
    const clean = s.replace(/\D/g, "");
    if (clean.length === 8) {
      const day = clean.slice(0,2), mon = clean.slice(2,4), yr = clean.slice(4);
      return { day, month: MONTHS_LABEL[parseInt(mon, 10)-1] || "", year: yr };
    }
    return { day: "", month: "", year: "" };
  }

  // Parse name: Vietnamese CCCD stores as "NGUYEN VAN A" — last word = first name, rest = last name
  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts.slice(1).join(" "); // tên (everything after first word)
  const lastName  = nameParts[0] || "";            // họ (first word)

  const cleanGender = genderRaw.trim().toLowerCase();
  const gender = (cleanGender === "nam" || cleanGender === "male" || cleanGender === "m") ? "Nam"
    : (cleanGender === "nữ" || cleanGender === "nu" || cleanGender === "female" || cleanGender === "f") ? "Nữ"
    : genderRaw;

  return {
    lastName,
    firstName,
    dob: parseDate(dobRaw),
    gender,
    nationality: nat.includes("Viet") || nat.includes("Việt") ? "Việt Nam" : nat,
    docNumber: id,
    docExpiry: parseDate(expRaw),
  };
}

function CCCDScanner({ open, onClose, onResult }: {
  open: boolean; onClose: () => void; onResult: (data: CCCDData) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream|null>(null);
  const rafRef    = useRef<number>(0);
  const activeRef = useRef(false); // guard against stale closures
  const [status, setStatus] = useState<"idle"|"starting"|"scanning"|"error"|"success">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (open) { startCamera(); }
    return stopAll;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function stopAll() {
    activeRef.current = false;
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  async function startCamera() {
    setStatus("starting"); setErrorMsg(""); activeRef.current = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setErrorMsg("Trình duyệt không hỗ trợ camera. Hãy dùng HTTPS hoặc thử trình duyệt khác.");
      return;
    }
    try {
      // prefer back camera, fallback to any
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } } });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      if (!activeRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play().then(() => { setStatus("scanning"); scheduleFrame(); }).catch(() => {
          setStatus("error"); setErrorMsg("Không thể phát video từ camera.");
        });
      };
    } catch (err: any) {
      if (!activeRef.current) return;
      setStatus("error");
      setErrorMsg(err?.name === "NotAllowedError"
        ? "Quyền camera bị từ chối. Hãy cho phép camera trong cài đặt trình duyệt."
        : "Không thể truy cập camera. Đảm bảo không có ứng dụng nào đang dùng camera.");
    }
  }

  function scheduleFrame() {
    if (!activeRef.current) return;
    rafRef.current = requestAnimationFrame(doFrame);
  }

  function doFrame() {
    if (!activeRef.current) return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    // HAVE_ENOUGH_DATA = 4
    if (!video || !canvas || video.readyState < 4 || video.videoWidth === 0) {
      scheduleFrame(); return;
    }
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(video, 0, 0);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // try both inversion modes for better detection
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
    if (code?.data) {
      const parsed = parseCCCD(code.data);
      if (parsed) {
        activeRef.current = false;
        cancelAnimationFrame(rafRef.current);
        setStatus("success");
        // short delay so user sees the success state
        setTimeout(() => { stopAll(); onResult(parsed); onClose(); }, 600);
        return;
      }
    }
    scheduleFrame();
  }

  return (
    <Modal open={open} onClose={onClose} title="Quét mã QR CCCD">
      <div className="p-5 flex flex-col items-center gap-4">
        {/* Viewfinder */}
        <div className="relative w-full max-w-xs aspect-square bg-black rounded-2xl overflow-hidden">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted/>
          <canvas ref={canvasRef} className="hidden"/>
          {/* Corner guides */}
          {(status === "scanning" || status === "starting") && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-52 h-52">
                {/* Corner brackets */}
                {(["top-0 left-0","top-0 right-0","bottom-0 left-0","bottom-0 right-0"] as const).map((pos,pi) => (
                  <div key={pos} className={cn("absolute w-8 h-8",
                    pos.includes("top") ? "top-0" : "bottom-0",
                    pos.includes("left") ? "left-0" : "right-0")}>
                    <div className={cn("absolute bg-accent",
                      pi===0||pi===2 ? "left-0 top-0 w-0.5 h-8" : "right-0 top-0 w-0.5 h-8")}/>
                    <div className={cn("absolute bg-accent",
                      pi<2 ? "top-0 w-8 h-0.5" : "bottom-0 w-8 h-0.5")}/>
                  </div>
                ))}
                {/* Scan line */}
                {status === "scanning" && (
                  <motion.div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent"
                    initial={{top:"5%"}} animate={{top:"95%"}} transition={{duration:2,repeat:Infinity,repeatType:"reverse",ease:"linear"}}/>
                )}
              </div>
            </div>
          )}
          {status === "success" && (
            <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20">
              <motion.div initial={{scale:0}} animate={{scale:1}} className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-xl">
                <Check size={32} className="text-white"/>
              </motion.div>
            </div>
          )}
          {status === "idle" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Camera size={40} className="text-white/30"/>
            </div>
          )}
        </div>

        {status === "error" ? (
          <div className="text-center space-y-3 w-full">
            <p className="text-red-400 text-sm">{errorMsg}</p>
            <button onClick={startCamera} className="bg-primary hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all">
              Thử lại
            </button>
          </div>
        ) : status === "scanning" ? (
          <div className="text-center">
            <p className="text-white/60 text-sm font-medium">Hướng camera vào mã QR mặt sau CCCD</p>
            <p className="text-white/35 text-xs mt-1">Giữ thẳng, ánh sáng đủ, khoảng cách 15–20cm</p>
          </div>
        ) : status === "starting" ? (
          <p className="text-white/45 text-sm flex items-center gap-2">
            <motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}} className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full"/>
            Đang khởi động camera...
          </p>
        ) : status === "success" ? (
          <p className="text-emerald-400 text-sm font-semibold flex items-center gap-2"><Check size={15}/> Đọc thành công! Đang điền thông tin...</p>
        ) : null}

        <div className="w-full p-3 bg-blue-500/8 border border-blue-500/18 rounded-xl text-xs text-blue-300/70 flex items-start gap-2">
          <Info size={13} className="shrink-0 mt-0.5"/>
          <span>Mã QR trên CCCD chip (2021+) chứa đầy đủ thông tin cá nhân. Dữ liệu chỉ được dùng để điền form và không lưu trữ.</span>
        </div>
      </div>
    </Modal>
  );
}

function Details({ state, setState, onNext, onBack }: { state: BookingState; setState: (s: Partial<BookingState>) => void; onNext: () => void; onBack: () => void }) {
  const paxCount = state.passengers.adults + state.passengers.children;
  const flight = FLIGHTS.find(f => f.code === state.flightCode) ?? FLIGHTS[0];
  const fareClass = FARE_CLASSES.find(f => f.id === state.fareClass) ?? FARE_CLASSES[0];
  const [seatOpen, setSeatOpen] = useState(false);
  const [addonInfo, setAddonInfo] = useState<typeof ADD_ONS[0] | null>(null);
  const [expandedPax, setExpandedPax] = useState(0);
  const [scanningPax, setScanningPax] = useState<number | null>(null);
  const [showCartDetail, setShowCartDetail] = useState(true);
  const [showBaggage, setShowBaggage] = useState(false);
  const [showAddons, setShowAddons] = useState(true);
  const [showVoucher, setShowVoucher] = useState(false);
  const [voucherInput, setVoucherInput] = useState(state.promoCode);
  const [voucherApplied, setVoucherApplied] = useState(!!state.promoCode);
  const [contact, setContact] = useState<ContactPerson>(state.contact ?? { name: "", phone: "", email: "" });
  const [details, setDetails] = useState<PassengerDetail[]>(() => {
    const base = [...(state.passengerDetails ?? [])];
    while (base.length < paxCount) base.push(emptyPax());
    return base.slice(0, paxCount);
  });

  function update(idx: number, field: keyof PassengerDetail, val: string) {
    setDetails(prev => prev.map((d, i) => i === idx ? { ...d, [field]: val } : d));
  }

  function toggleAddon(addon: typeof ADD_ONS[0]) {
    const ids = new Set(state.selectedAddOns);
    const delta = ids.has(addon.id) ? -addon.price : addon.price;
    ids.has(addon.id) ? ids.delete(addon.id) : ids.add(addon.id);
    const newFee = state.ancillaryFee + delta;
    setState({
      selectedAddOns: Array.from(ids),
      ancillaryFee: newFee,
      totalPrice: state.baseFare + state.taxFee + newFee
    });
  }

  function applyVoucher() {
    if (voucherInput.trim()) {
      setState({ promoCode: voucherInput });
      setVoucherApplied(true);
    }
  }

  // per-pax fare prices (children 75%, infants 10%)
  const adultFare = state.baseFare;
  const childFare = Math.round(state.baseFare * 0.75);
  const infantFare = Math.round(state.baseFare * 0.10);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background text-slate-800 dark:text-slate-100" style={{ fontFamily: "'Inter', sans-serif" }}>
      <TopBar step={2} onBack={onBack} />
      
      <SeatModal open={seatOpen} onClose={() => setSeatOpen(false)} details={details} onConfirm={seats => setDetails(prev => prev.map((d, i) => ({ ...d, seat: seats[i] ?? "" })))} />
      <AddOnInfoModal addon={addonInfo} open={!!addonInfo} onClose={() => setAddonInfo(null)} />
      
      <CCCDScanner
        open={scanningPax !== null}
        onClose={() => setScanningPax(null)}
        onResult={data => {
          if (scanningPax === null) return;
          setDetails(prev => prev.map((d, i) => i === scanningPax ? {
            ...d,
            lastName: data.lastName,
            firstName: data.firstName,
            dobDay: data.dob.day,
            dobMonth: data.dob.month,
            dobYear: data.dob.year,
            gender: data.gender,
            nationality: data.nationality,
            docNumber: data.docNumber,
            docType: "CCCD",
            docCountry: "Việt Nam",
            docExpDay: data.docExpiry.day,
            docExpMonth: data.docExpiry.month,
            docExpYear: data.docExpiry.year,
          } : d));
        }}
      />

      <div className="max-w-6xl mx-auto px-6 py-7 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          {/* Flight recap */}
          <GlassCard className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <Plane size={15} className="text-primary rotate-90" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-800 font-extrabold text-sm">{state.origin} → {state.destination}</span>
                <span className="text-slate-500 text-xs bg-slate-100 px-2.5 py-0.5 rounded-full font-semibold">{flight.dep} – {flight.arr}</span>
                <span className="text-accent text-xs font-bold font-mono bg-accent/10 px-2 py-0.5 rounded-full">{state.flightCode}</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ background: fareClass.accent + "18", color: fareClass.accent }}>
                  {fareClass.label}
                </span>
              </div>
              <div className="text-slate-400 text-xs mt-0.5 font-semibold">{state.departDate}</div>
            </div>
          </GlassCard>

          {/* ── Representative Contact ── */}
          <GlassCard className="overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-slate-800 font-extrabold text-sm flex items-center gap-2">
                <Users size={15} className="text-accent" />
                Thông tin người liên hệ đại diện đặt vé
              </h2>
              <p className="text-slate-400 text-xs font-semibold mt-1">
                Vé điện tử và hóa đơn sẽ được gửi về thông tin liên hệ này.
              </p>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputField label="Họ và tên đại diện" value={contact.name} onChange={v => setContact(c => ({ ...c, name: v }))} placeholder="NGUYỄN VĂN NAM" required />
              <InputField label="Số điện thoại di động" value={contact.phone} onChange={v => setContact(c => ({ ...c, phone: v }))} placeholder="+84 xxx xxx xxx" type="tel" required />
              <InputField label="Địa chỉ Email" value={contact.email} onChange={v => setContact(c => ({ ...c, email: v }))} placeholder="email@example.com" type="email" required />
            </div>
          </GlassCard>

          {/* ── Passengers list ── */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-slate-800 font-extrabold text-sm flex items-center gap-2">
                <Users size={15} className="text-accent" /> Thông tin chi tiết hành khách
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-slate-400 text-xs font-bold hidden sm:block">* Yêu cầu bắt buộc</span>
                {paxCount > 1 && (
                  <button 
                    onClick={() => setSeatOpen(true)} 
                    className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-white bg-primary/10 hover:bg-primary px-3 py-2 rounded-xl transition-all border border-primary/20"
                  >
                    <Armchair size={13} /> Sơ đồ chọn ghế cả đoàn
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-800 font-semibold leading-relaxed">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-primary" />
              <span>Vui lòng điền đúng thông tin hành khách giống như trên CCCD / Hộ chiếu dùng để bay.</span>
            </div>

            {Array.from({ length: paxCount }, (_, i) => {
              const paxLabel = getPaxLabel(state, i);
              const expanded = expandedPax === i;
              const d = details[i] ?? emptyPax();
              const hasName = !!(d.firstName && d.lastName);
              
              return (
                <GlassCard key={i} className="overflow-hidden">
                  <div className="flex items-center border-b border-transparent">
                    <button 
                      onClick={() => setExpandedPax(expanded ? -1 : i)} 
                      className="flex-1 flex items-center gap-3.5 px-5 py-4 text-left hover:bg-slate-50/50 transition-colors"
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors border",
                        hasName && d.seat 
                          ? "bg-emerald-50 border-emerald-300 text-emerald-600" 
                          : hasName 
                            ? "bg-blue-50 border-blue-200 text-primary" 
                            : "bg-slate-100 border-slate-200 text-slate-400"
                      )}>
                        {hasName && d.seat ? <Check size={12} /> : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-slate-800 font-extrabold text-sm">{paxLabel}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {d.lastName && d.firstName && (
                            <span className="text-slate-500 font-semibold text-xs">{d.salutation}. {d.lastName} {d.firstName}</span>
                          )}
                          {d.seat && (
                            <span className="text-accent text-[10px] font-bold font-mono bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
                              Ghế {d.seat}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronDown size={14} className={cn("text-slate-400 transition-transform shrink-0", expanded && "rotate-180")} />
                    </button>
                    
                    {/* Scan CCCD button */}
                    <button
                      onClick={e => { e.stopPropagation(); setScanningPax(i); if (!expanded) setExpandedPax(i); }}
                      className="flex items-center gap-1 text-xs font-bold text-accent hover:text-white bg-accent/10 hover:bg-accent px-3 py-2 rounded-xl transition-all border border-accent/20 mr-4 shrink-0"
                    >
                      <ScanLine size={13} /> Quét CCCD
                    </button>
                  </div>

                  <AnimatePresence>
                    {expanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden border-t border-slate-100">
                        <div className="p-5 space-y-5">
                          {/* Name Input */}
                          <div>
                            <SectionTitle>Tên hành khách</SectionTitle>
                            <p className="text-slate-400 text-xs font-semibold mb-3">Vui lòng điền không dấu. Tránh viết ký tự đặc biệt.</p>
                            <div className="grid grid-cols-3 gap-3">
                              <SelectField label="Danh xưng" value={d.salutation} onChange={v => update(i, "salutation", v)} options={["Mr", "Mrs", "Ms", "Mstr", "Miss"]} required />
                              <InputField label="Họ (không dấu)" value={d.lastName} onChange={v => update(i, "lastName", v.toUpperCase())} placeholder="NGUYEN" required mono />
                              <InputField label="Tên đệm & Tên" value={d.firstName} onChange={v => update(i, "firstName", v.toUpperCase())} placeholder="VAN NAM" required mono />
                            </div>
                          </div>

                          {/* DOB */}
                          <div>
                            <SectionTitle>Ngày tháng năm sinh</SectionTitle>
                            <FlexDatePicker
                              day={d.dobDay} month={d.dobMonth} year={d.dobYear}
                              onDay={v => update(i, "dobDay", v)} onMonth={v => update(i, "dobMonth", v)} onYear={v => update(i, "dobYear", v)}
                              pastOnly required
                            />
                          </div>

                          {/* Gender & Nationality */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <div>
                              <label className="text-slate-500 text-xs font-bold uppercase tracking-wider block mb-2">
                                Giới tính <span className="text-red-500">*</span>
                              </label>
                              <div className="flex items-center gap-3">
                                {["Nam", "Nữ"].map(g => (
                                  <button 
                                    key={g} 
                                    onClick={() => update(i, "gender", g)}
                                    className={cn(
                                      "flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all",
                                      d.gender === g
                                        ? "bg-primary border-primary text-white"
                                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                    )}
                                  >
                                    <div className={cn("w-3 h-3 rounded-full border flex items-center justify-center transition-all", d.gender === g ? "border-white bg-white/20" : "border-slate-300 bg-white")}>
                                      {d.gender === g && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                    </div>
                                    {g}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <SelectField label="Quốc tịch" value={d.nationality} onChange={v => update(i, "nationality", v)} options={NATIONALITIES} placeholder="Chọn quốc tịch" required />
                          </div>

                          {/* Passport / CCCD details */}
                          <div>
                            <SectionTitle>Giấy tờ thông hành</SectionTitle>
                            <div className="grid grid-cols-3 gap-3 mb-3.5">
                              <SelectField label="Loại giấy tờ" value={d.docType} onChange={v => update(i, "docType", v)} options={["CCCD", "Hộ chiếu"]} required />
                              <InputField label="Số hiệu giấy tờ" value={d.docNumber} onChange={v => update(i, "docNumber", v.toUpperCase())} placeholder="Số hiệu..." required mono />
                              <SelectField label="Quốc gia phát hành" value={d.docCountry} onChange={v => update(i, "docCountry", v)} options={COUNTRIES} placeholder="Quốc gia" required />
                            </div>
                            <FlexDatePicker
                              label="Ngày hết hạn giấy tờ"
                              day={d.docExpDay} month={d.docExpMonth} year={d.docExpYear}
                              onDay={v => update(i, "docExpDay", v)} onMonth={v => update(i, "docExpMonth", v)} onYear={v => update(i, "docExpYear", v)}
                              futureOnly required
                            />
                          </div>

                          {/* Membership program */}
                          <div>
                            <SectionTitle>Dặm bay tích lũy (VieTravel Miles / Lotusmiles - Tùy chọn)</SectionTitle>
                            <div className="grid grid-cols-2 gap-3">
                              <SelectField value={d.ffProgram} onChange={v => update(i, "ffProgram", v)} options={FF_PROGRAMS} placeholder="Chương trình hội viên" />
                              <InputField value={d.ffNumber} onChange={v => update(i, "ffNumber", v)} placeholder="Mã số hội viên" mono />
                            </div>
                          </div>

                          {/* Seat Picker button */}
                          <div>
                            <label className="text-slate-500 text-xs font-bold uppercase tracking-wider block mb-2">Ghế ngồi mong muốn</label>
                            <button 
                              onClick={() => setSeatOpen(true)} 
                              className={cn(
                                "w-full flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold transition-all",
                                d.seat ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-500"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <Armchair size={14} className={d.seat ? "text-emerald-600" : "text-slate-400"} />
                                {d.seat ? (
                                  <span>Ghế đã chọn: <b className="font-mono text-sm">{d.seat}</b> (Nhấp để đổi)</span>
                                ) : (
                                  <span>Chưa chọn ghế — Nhấp để mở sơ đồ cabin chọn chỗ</span>
                                )}
                              </div>
                              <ChevronRight size={13} className="text-slate-400 shrink-0" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </GlassCard>
              );
            })}
          </div>
        </div>

        {/* Right Column: Order breakdown & Addons sidebar */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 lg:self-start space-y-4">
          <GlassCard className="overflow-hidden flex flex-col">
            
            {/* Cart breakdown */}
            <div>
              <button 
                onClick={() => setShowCartDetail(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Plane size={14} className="text-primary rotate-90 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-slate-800 font-extrabold text-xs">{state.flightCode} — {fareClass.label}</div>
                    <div className="text-slate-400 font-semibold text-[10px] mt-0.5">{state.origin} → {state.destination}</div>
                  </div>
                </div>
                <ChevronDown size={14} className={cn("text-slate-400 transition-transform shrink-0 ml-2", showCartDetail && "rotate-180")} />
              </button>
              
              <AnimatePresence>
                {showCartDetail && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden border-t border-slate-100">
                    <div className="px-5 py-3.5 space-y-2 text-xs text-slate-600 font-semibold">
                      {state.passengers.adults > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">{state.passengers.adults} Người lớn × ${adultFare}</span>
                          <span className="text-slate-850">${adultFare * state.passengers.adults}</span>
                        </div>
                      )}
                      {state.passengers.children > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">{state.passengers.children} Trẻ em × ${childFare}</span>
                          <span className="text-slate-850">${childFare * state.passengers.children}</span>
                        </div>
                      )}
                      {state.passengers.infants > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">{state.passengers.infants} Em bé × ${infantFare}</span>
                          <span className="text-slate-850">${infantFare * state.passengers.infants}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-slate-100">
                        <span className="text-slate-400">Thuế sân bay & phí dịch vụ</span>
                        <span className="text-slate-850">${state.taxFee}</span>
                      </div>
                      {details.some(d => d.seat) && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Ghế cabin đã chọn</span>
                          <span className="text-accent font-bold font-mono">{details.map(d => d.seat).filter(Boolean).join(", ")}</span>
                        </div>
                      )}
                      <AnimatePresence>
                        {state.selectedAddOns.map(id => {
                          const a = ADD_ONS.find(x => x.id === id)!;
                          return (
                            <motion.div key={id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex justify-between overflow-hidden text-xs text-slate-600">
                              <span className="text-slate-400 truncate pr-2">{a.label}</span>
                              <span className="text-primary font-bold shrink-0">+${a.price}</span>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                      {(voucherApplied || state.promoCode) && (
                        <div className="flex justify-between pt-2 border-t border-slate-100 text-emerald-600 font-bold">
                          <span className="flex items-center gap-1"><Tag size={10} /> Mã KM: {voucherApplied ? voucherInput : state.promoCode}</span>
                          <span>−10%</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Baggage info */}
            <div className="border-t border-slate-100">
              <button 
                onClick={() => setShowBaggage(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Luggage size={14} className="text-slate-400" />
                  <span className="text-slate-600 text-xs font-bold">Hành lý miễn cước đi kèm</span>
                </div>
                <ChevronDown size={14} className={cn("text-slate-400 transition-transform shrink-0", showBaggage && "rotate-180")} />
              </button>
              <AnimatePresence>
                {showBaggage && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden border-t border-slate-100 p-4">
                    <BaggagePanel fareId={state.fareClass} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Addons selection */}
            <div className="border-t border-slate-100">
              <button 
                onClick={() => setShowAddons(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Star size={14} className="text-accent" />
                  <span className="text-slate-600 text-xs font-bold">Dịch vụ bổ trợ chọn thêm</span>
                  {state.selectedAddOns.length > 0 && (
                    <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                      {state.selectedAddOns.length}
                    </span>
                  )}
                </div>
                <ChevronDown size={14} className={cn("text-slate-400 transition-transform shrink-0", showAddons && "rotate-180")} />
              </button>
              <AnimatePresence>
                {showAddons && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden border-t border-slate-100 p-4 space-y-2">
                    {ADD_ONS.map(addon => {
                      const sel = state.selectedAddOns.includes(addon.id);
                      const Icon = addon.icon;
                      return (
                        <div 
                          key={addon.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer",
                            sel ? "bg-primary/5 border-primary/30" : "bg-slate-50 border-slate-200 hover:border-slate-300"
                          )}
                          onClick={() => toggleAddon(addon)}
                        >
                          <div className={cn("w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all", sel ? "bg-primary border-primary text-white" : "border-slate-300 bg-white")}>
                            {sel && <Check size={11} />}
                          </div>
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors", sel ? "bg-primary/10" : "bg-slate-200/50")}>
                            <Icon size={14} className={sel ? "text-primary" : "text-slate-400"} />
                          </div>
                          <div className="flex-1 min-w-0 text-xs">
                            <div className="text-slate-700 font-bold">{addon.label}</div>
                            <div className="text-slate-400 text-[10px] leading-snug mt-0.5 truncate font-semibold">{addon.desc}</div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                            <span className="font-extrabold text-xs text-primary">+${addon.price}</span>
                            <button onClick={() => setAddonInfo(addon)} className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-200/60 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                              <Info size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Voucher code */}
            <div className="border-t border-slate-100">
              <button 
                onClick={() => setShowVoucher(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Tag size={14} className={voucherApplied || state.promoCode ? "text-emerald-600" : "text-slate-450"} />
                  <span className={cn("text-xs font-bold", voucherApplied || state.promoCode ? "text-emerald-600" : "text-slate-650")}>
                    {voucherApplied || state.promoCode ? `Mã KM đã dùng: ${voucherApplied ? voucherInput : state.promoCode}` : "Mã ưu đãi / Khuyến mãi"}
                  </span>
                </div>
                <ChevronDown size={14} className={cn("text-slate-400 transition-transform shrink-0", showVoucher && "rotate-180")} />
              </button>
              <AnimatePresence>
                {showVoucher && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden border-t border-slate-100 p-4">
                    <div className="flex gap-2">
                      <input
                        type="text" 
                        placeholder="Nhập mã voucher..."
                        value={voucherInput}
                        onChange={e => { setVoucherInput(e.target.value.toUpperCase()); setVoucherApplied(false); }}
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary transition-all text-xs font-mono uppercase tracking-wider"
                      />
                      <button 
                        onClick={applyVoucher}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border",
                          voucherApplied ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-primary text-white border-primary hover:bg-blue-900"
                        )}
                      >
                        {voucherApplied ? <Check size={13} /> : "Áp dụng"}
                      </button>
                    </div>
                    {voucherApplied && (
                      <p className="text-emerald-600 text-[10px] font-semibold mt-1 flex items-center gap-1">
                        <Check size={10} /> Ưu đãi giảm 10% đơn hàng đã được áp dụng
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Total and proceed */}
            <div className="border-t border-slate-200 px-5 py-4 bg-slate-50">
              <div className="flex justify-between items-center mb-3">
                <span className="text-slate-600 font-bold text-sm">Tổng thanh toán</span>
                <motion.span 
                  key={state.totalPrice} 
                  initial={{ scale: 1.1, color: "#EAA135" }} 
                  animate={{ scale: 1, color: "#003057" }} 
                  transition={{ duration: 0.2 }}
                  className="text-primary text-2xl font-black"
                >
                  ${state.totalPrice}
                </motion.span>
              </div>
              <button 
                onClick={() => { setState({ passengerDetails: details, contact, promoCode: voucherApplied ? voucherInput : state.promoCode }); onNext(); }}
                className="w-full bg-primary hover:bg-blue-900 text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 hover:-translate-y-0.5"
              >
                Tiếp tục thanh toán <ChevronRight size={14} />
              </button>
              <div className="flex items-center justify-center gap-1.5 text-slate-400 text-[10px] font-semibold mt-3">
                <Shield size={11} /> Bảo mật SSL mã hóa thông tin 256-bit
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function PaymentSidebar({ state }: { state: BookingState }) {
  const [showDetail, setShowDetail] = useState(true);
  const fareClass = FARE_CLASSES.find(f => f.id === state.fareClass);
  const adultFare = state.baseFare;
  const childFare = Math.round(state.baseFare * 0.75);
  const infantFare = Math.round(state.baseFare * 0.10);
  
  return (
    <GlassCard className="overflow-hidden flex flex-col">
      {/* Flight summary row */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
        <Plane size={14} className="text-primary rotate-90 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-slate-800 font-extrabold text-xs">{state.flightCode} — {fareClass?.label}</div>
          <div className="text-slate-400 font-semibold text-[10px] mt-0.5">{state.origin} → {state.destination} · {state.departDate}</div>
        </div>
      </div>
      
      {/* Collapsible breakdown */}
      <button 
        onClick={() => setShowDetail(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 transition-colors text-left"
      >
        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Chi tiết đơn đặt chỗ</span>
        <ChevronDown size={14} className={cn("text-slate-400 transition-transform shrink-0", showDetail && "rotate-180")} />
      </button>
      
      <AnimatePresence>
        {showDetail && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden border-t border-slate-100">
            <div className="px-5 py-3.5 space-y-2 text-xs text-slate-600 font-semibold bg-white">
              {state.passengers.adults > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-450">{state.passengers.adults} Người lớn × ${adultFare}</span>
                  <span className="text-slate-850">${adultFare * state.passengers.adults}</span>
                </div>
              )}
              {state.passengers.children > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-450">{state.passengers.children} Trẻ em × ${childFare}</span>
                  <span className="text-slate-850">${childFare * state.passengers.children}</span>
                </div>
              )}
              {state.passengers.infants > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-450">{state.passengers.infants} Em bé × ${infantFare}</span>
                  <span className="text-slate-850">${infantFare * state.passengers.infants}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-100">
                <span className="text-slate-450">Thuế sân bay & phí dịch vụ</span>
                <span className="text-slate-850">${state.taxFee}</span>
              </div>
              {state.ancillaryFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-450">Dịch vụ bổ trợ thêm</span>
                  <span className="text-primary font-bold">+${state.ancillaryFee}</span>
                </div>
              )}
              {state.promoCode && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span className="flex items-center gap-1"><Tag size={10} /> Mã ưu đãi KM</span>
                  <span>−10% (${Math.round((state.baseFare * (state.passengers.adults + state.passengers.children)) * 0.1)})</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Total — always visible */}
      <div className="border-t border-slate-200 px-5 py-4 bg-slate-50 flex justify-between items-center">
        <span className="text-slate-700 font-bold text-sm">Tổng cộng thanh toán</span>
        <span className="text-primary text-2xl font-black">${state.totalPrice}</span>
      </div>
    </GlassCard>
  );
}

function Payment({ state, onBack }: { state: BookingState; onBack: () => void }) {
  const [paid, setPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "shb">("card");
  const [cardNum, setCardNum] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  
  const fmtCard = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const fmtExp = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };
  
  const fareClass = FARE_CLASSES.find(f => f.id === state.fareClass);
  const pax = state.passengerDetails?.[0];
  const paxName = pax ? `${pax.lastName} ${pax.firstName}`.trim() : "";

  if (paid) return <ETicket state={state} />;
  
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background pb-16 text-slate-800 dark:text-slate-100" style={{ fontFamily: "'Inter', sans-serif" }}>
      <TopBar step={3} onBack={onBack} />
      
      <div className="max-w-6xl mx-auto px-6 py-7 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          
          {/* Booking Recap */}
          <GlassCard className="p-5">
            <h2 className="text-slate-800 font-extrabold text-sm mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Check size={15} className="text-emerald-600" /> Xác thực thông tin đơn đặt chỗ
            </h2>
            {/* Contact person */}
            <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl mb-4">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <Users size={14} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0 text-xs">
                <div className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-0.5">Liên hệ đại diện</div>
                <div className="text-slate-800 font-bold">{state.contact?.name || "—"}</div>
                <div className="text-slate-450 font-semibold mt-0.5">{state.contact?.phone} · {state.contact?.email}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
              {[
                ["Hành khách đại diện", paxName || "—"],
                ["Ký hiệu chuyến bay", state.flightCode],
                ["Chặng bay hành trình", `${state.origin} → ${state.destination}`],
                ["Ngày khởi hành", state.departDate],
                ["Ghế cabin đã chọn", state.passengerDetails?.map(d => d.seat).filter(Boolean).join(", ") || "—"],
                ["Hạng dịch vụ vé", fareClass?.label || "—"],
              ].map(([l, v]) => (
                <div key={l} className="bg-slate-50 border border-slate-150 rounded-xl p-3">
                  <div className="text-slate-400 font-bold text-[10px] uppercase mb-1">{l}</div>
                  <div className="text-slate-800 font-extrabold truncate">{v}</div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Payment Info */}
          <GlassCard className="p-5">
            <h2 className="text-slate-800 font-extrabold text-sm mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <CreditCard size={15} className="text-accent" /> Chọn hình thức thanh toán bảo mật
            </h2>
            
            {/* Payment Method Selector */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                onClick={() => setPaymentMethod("card")}
                className={cn(
                  "p-4 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 cursor-pointer",
                  paymentMethod === "card" ? "border-primary bg-primary/5 text-primary font-bold shadow-sm" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                )}
              >
                <span className="text-lg">💳</span>
                <span className="text-xs">Thẻ tín dụng Quốc tế</span>
              </button>
              <button
                onClick={() => setPaymentMethod("shb")}
                className={cn(
                  "p-4 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 cursor-pointer",
                  paymentMethod === "shb" ? "border-primary bg-primary/5 text-primary font-bold shadow-sm" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                )}
              >
                <span className="text-lg">🏦</span>
                <span className="text-xs">Cổng SHB Pay (Ưu đãi T&T)</span>
              </button>
            </div>

            {paymentMethod === "card" ? (
              <div className="space-y-4">
                {/* Visual credit card layout */}
                <div className="relative h-36 rounded-2xl overflow-hidden bg-gradient-to-br from-primary via-[#004b87] to-primary p-5 shadow-lg shadow-primary/10">
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.3) 0%,transparent 50%)" }} />
                  <div className="relative z-10 h-full flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div className="w-8 h-6 bg-yellow-400/80 rounded-md" />
                      <span className="text-white/60 text-xs font-black tracking-widest">VISA</span>
                    </div>
                    <div>
                      <div className="text-white font-mono text-base tracking-widest mb-1 opacity-90">{cardNum || "•••• •••• •••• ••••"}</div>
                      <div className="flex justify-between text-white/50 text-[10px] font-bold uppercase">
                        <span>{paxName || "CARDHOLDER"}</span>
                        <span>{expiry || "MM/YY"}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <InputField label="Số thẻ tín dụng" value={cardNum} onChange={v => setCardNum(fmtCard(v))} placeholder="4123 4567 8901 2345" mono />
                  <div className="grid grid-cols-2 gap-3">
                    <InputField label="Hạn sử dụng" value={expiry} onChange={v => setExpiry(fmtExp(v))} placeholder="MM/YY" mono />
                    <InputField label="Mã bảo mật CVV" value={cvv} onChange={v => setCvv(v.replace(/\D/g, "").slice(0, 3))} placeholder="•••" mono />
                  </div>
                </div>
                
                <button 
                  onClick={() => setPaid(true)} 
                  className="w-full mt-4 bg-[#F26722] hover:bg-orange-600 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20 active:scale-95 cursor-pointer"
                >
                  <Shield size={17} /> Thanh toán an toàn ${state.totalPrice}
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-center p-4 border border-slate-200 rounded-2xl bg-slate-50/50">
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                    <QrCode size={140} className="text-primary" />
                  </div>
                  <div>
                    <h4 className="text-slate-800 font-extrabold text-sm flex items-center justify-center gap-1.5">
                      <span>✓</span> Mã QR thanh toán SHB Pay
                    </h4>
                    <p className="text-slate-400 text-xs font-semibold mt-1 max-w-sm mx-auto">
                      Mở app ngân hàng bất kỳ (SHB Mobile, VCB, BIDV...) quét mã QR trên để thanh toán và nhận vé ngay lập tức.
                    </p>
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 text-left text-xs text-primary font-semibold space-y-1">
                  <div className="font-extrabold text-slate-800">🎁 Ưu đãi độc quyền từ Tập đoàn T&T Group:</div>
                  <div>Giảm ngay 5% trực tiếp vào tài khoản (hoàn tiền) khi thực hiện thanh toán qua cổng SHB Pay thành công.</div>
                </div>

                <button 
                  onClick={() => setPaid(true)} 
                  className="w-full bg-[#F26722] hover:bg-orange-600 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20 active:scale-95 cursor-pointer"
                >
                  <Check size={17} /> Xác nhận đã chuyển khoản
                </button>
              </div>
            )}
          </GlassCard>
        </div>
        
        {/* Right column: Sticky Payment Sidebar */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
          <PaymentSidebar state={state} />
        </div>
      </div>
    </div>
  );
}

function ETicket({ state }: { state: BookingState }) {
  const oCode = CITIES.find(c => c.name === state.origin)?.code ?? "---";
  const dCode = CITIES.find(c => c.name === state.destination)?.code ?? "---";
  const fl = FLIGHTS.find(f => f.code === state.flightCode) ?? FLIGHTS[0];
  const bookRef = "VTA" + Math.random().toString(36).slice(2, 8).toUpperCase();
  const fareLabel = FARE_CLASSES.find(f => f.id === state.fareClass)?.label ?? "Economy";
  const pax = state.passengerDetails?.[0];
  const paxName = pax ? `${pax.lastName} ${pax.firstName}`.trim() : "—";
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12" style={{ fontFamily: "'Inter', sans-serif" }}>
      <motion.div initial={{ opacity: 0, scale: 0.88, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 165, damping: 20 }} className="w-full max-w-lg">
        <div className="text-center mb-8">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring", stiffness: 255 }} className="w-20 h-20 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm"><Check size={34} /></motion.div>
          <h1 className="text-slate-800 dark:text-slate-100 text-3xl font-black mb-2">Đặt vé thành công!</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">Vé điện tử đã gửi đến <span className="text-primary dark:text-accent font-bold">{state.contact?.email || pax?.email || "email của bạn"}</span></p>
        </div>
        <div className="bg-white dark:bg-card rounded-3xl overflow-hidden shadow-xl border border-slate-100 dark:border-slate-800">
          <div className="bg-gradient-to-br from-primary to-[#004b87] px-7 pt-6 pb-10 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 75% 25%, white 0%, transparent 55%)" }} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5"><Plane size={12} className="text-accent rotate-45" /><span className="text-white/80 text-[10px] font-extrabold tracking-widest">VIETRAVEL AIRLINES</span></div>
                <span className="bg-white/15 rounded-full px-3 py-1 text-white text-xs font-mono font-bold">{state.flightCode}</span>
              </div>
              <div className="flex items-center justify-between mt-5">
                <div><div className="text-white text-5xl font-black font-mono leading-none">{oCode}</div><div className="text-white/60 text-xs font-bold mt-1.5">{state.origin}</div></div>
                <div className="flex flex-col items-center gap-0.5">
                  <div className="text-white/40 text-[9px] font-bold">{fl.dur}</div>
                  <div className="flex items-center gap-1.5 w-20"><div className="flex-1 h-px bg-white/20" /><Plane size={14} className="text-accent rotate-90" /><div className="flex-1 h-px bg-white/20" /></div>
                  <div className="text-white/40 text-[9px] font-bold">Bay thẳng</div>
                </div>
                <div className="text-right"><div className="text-white text-5xl font-black font-mono leading-none">{dCode}</div><div className="text-white/60 text-xs font-bold mt-1.5">{state.destination}</div></div>
              </div>
              <div className="flex justify-between mt-6">
                <div><div className="text-white/50 text-[9px] uppercase font-bold tracking-wider">Khởi hành</div><div className="text-white font-extrabold text-lg font-mono mt-0.5">{fl.dep}</div></div>
                <div className="text-center"><div className="text-white/50 text-[9px] uppercase font-bold tracking-wider">Ngày bay</div><div className="text-white font-extrabold text-sm mt-1">{state.departDate}</div></div>
                <div className="text-right"><div className="text-white/50 text-[9px] uppercase font-bold tracking-wider">Đến nơi</div><div className="text-white font-extrabold text-lg font-mono mt-0.5">{fl.arr}</div></div>
              </div>
            </div>
          </div>
          <div className="relative flex items-center -mt-px bg-white">
            <div className="w-6 h-6 rounded-full bg-slate-50 -ml-3 shrink-0" />
            <div className="flex-1 border-t border-dashed border-slate-200 mx-2" />
            <div className="w-6 h-6 rounded-full bg-slate-50 -mr-3 shrink-0" />
          </div>
          <div className="bg-white px-7 py-6">
            <div className="grid grid-cols-3 gap-y-4 gap-x-3 mb-5">
              {[
                ["Hành khách", paxName],
                ["Hạng vé", fareLabel],
                ["Ghế ngồi", pax?.seat || "—"],
                ["Mã đặt chỗ", bookRef],
                ["Cửa lên tàu", "B12"],
                ["Tổng thanh toán", `$${state.totalPrice}`]
              ].map(([l, v]) => (
                <div key={l}>
                  <div className="text-slate-400 text-[9px] uppercase font-bold tracking-wider mb-0.5">{l}</div>
                  <div className={cn("font-extrabold text-xs", (l === "Mã đặt chỗ" || l === "Tổng thanh toán") ? "text-primary font-mono text-sm" : "text-slate-800")}>
                    {v}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-5 pt-4 border-t border-slate-100">
              <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center p-2.5 shrink-0"><QrCode size={36} className="text-white" /></div>
              <div className="flex-1">
                <div className="text-slate-400 text-[9px] uppercase font-bold tracking-wider mb-1">Mã vạch lên tàu</div>
                <div className="flex gap-px h-7 items-center">
                  {Array.from({ length: 48 }, (_, i) => (
                    <div 
                      key={i} 
                      className="bg-slate-800 rounded-[1px] h-full" 
                      style={{ width: Math.random() > 0.45 ? "2px" : "1px", opacity: Math.random() > 0.1 ? 1 : 0.2 }} 
                    />
                  ))}
                </div>
                <div className="text-slate-400 text-[8px] font-mono mt-1 tracking-widest">{state.flightCode}{oCode}{dCode}2026062411400</div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => handleDownloadPDF(paxName, state.flightCode, pax?.seat || "—", bookRef, state.totalPrice)} className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer">Tải vé PDF</button>
          <button 
            onClick={() => window.location.reload()}
            className="flex-1 bg-primary hover:bg-blue-900 text-white py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/20 cursor-pointer"
          >
            Đặt chuyến khác
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function DarkModeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  
  const toggle = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    setDark(isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  };

  return (
    <button 
      onClick={toggle} 
      className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-50 hover:bg-slate-100 dark:bg-[#00223f] dark:hover:bg-slate-800 text-slate-500 dark:text-amber-400 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer shadow-sm hover:scale-105 shrink-0"
      title={dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
    >
      {dark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}

function AuthModal({ open, mode, onClose, onSwitch }: { open: boolean; mode: "signin" | "signup" | null; onClose: () => void; onSwitch: (m: "signin" | "signup") => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail(""); setPassword(""); setName(""); setPhone(""); setSuccess(false);
    }
  }, [open, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    }, 1200);
  };

  if (!open || !mode) return null;

  return (
    <Modal open={open} onClose={onClose} title={mode === "signin" ? "Đăng nhập tài khoản" : "Đăng ký tài khoản"}>
      {success ? (
        <div className="p-8 text-center space-y-3">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Check size={32} />
          </div>
          <h3 className="text-slate-800 dark:text-slate-100 font-extrabold text-lg">
            {mode === "signin" ? "Đăng nhập thành công!" : "Đăng ký thành công!"}
          </h3>
          <p className="text-slate-400 text-xs font-semibold">Chào mừng bạn đến với Vietravel Airlines</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-slate-800 dark:text-slate-100">
          {mode === "signup" && (
            <>
              <InputField label="Họ và tên" value={name} onChange={setName} placeholder="NGUYEN VAN A" required />
              <InputField label="Số điện thoại" value={phone} onChange={setPhone} placeholder="09xxxxxxxx" type="tel" required />
            </>
          )}
          <InputField label="Địa chỉ Email" value={email} onChange={setEmail} placeholder="yourname@domain.com" type="email" required />
          <InputField label="Mật khẩu" value={password} onChange={setPassword} placeholder="••••••••" type="password" required />
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary dark:bg-accent text-white dark:text-primary py-3 rounded-xl text-sm font-bold shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer mt-6"
          >
            {loading ? (
              <motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}} className="w-4 h-4 border-2 border-white dark:border-primary border-t-transparent rounded-full" />
            ) : mode === "signin" ? "Đăng nhập" : "Đăng ký"}
          </button>
          
          <div className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
            {mode === "signin" ? (
              <>
                Chưa có tài khoản?{" "}
                <button type="button" onClick={() => onSwitch("signup")} className="text-primary dark:text-accent font-bold hover:underline">Đăng ký ngay</button>
              </>
            ) : (
              <>
                Đã có tài khoản?{" "}
                <button type="button" onClick={() => onSwitch("signin")} className="text-primary dark:text-accent font-bold hover:underline">Đăng nhập ngay</button>
              </>
            )}
          </div>
        </form>
      )}
    </Modal>
  );
}

function RefundRescheduleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [bookingRef, setBookingRef] = useState("");
  const [lastName, setLastName] = useState("");
  const [step, setStep] = useState<"search" | "details" | "refundForm" | "rescheduleForm" | "rescheduleFlight" | "rescheduleSeat" | "reschedulePayment" | "success">("search");
  const [submitting, setSubmitting] = useState(false);
  const [actionType, setActionType] = useState<"refund" | "reschedule" | null>(null);
  const [newDate, setNewDate] = useState("");
  const [refundReason, setRefundReason] = useState("");

  // Reschedule specifics
  const [selectedNewFlight, setSelectedNewFlight] = useState<any>(null);
  const [selectedNewSeat, setSelectedNewSeat] = useState<string>("");
  const [selectedNewFareClass, setSelectedNewFareClass] = useState<"economy" | "business">("economy");
  const [reschedulePaymentMethod, setReschedulePaymentMethod] = useState<string>("qr");

  const SIMULATED_FLIGHTS = [
    { code: "VU751", time: "08:35 - 09:40", diff: 0, desc: "Chuyến bay sáng sớm - Phù hợp công tác" },
    { code: "VU753", time: "14:15 - 15:20", diff: 10, desc: "Giờ cất cánh đẹp - Khung giờ chiều" },
    { code: "VU755", time: "19:40 - 20:45", diff: 20, desc: "Chuyến tối muộn - Giá tiết kiệm" }
  ];

  const MINI_ROWS = [4, 5, 6, 7, 8];
  const MINI_COLS = ["A", "B", "C", "D", "E", "F"];
  const MINI_OCCUPIED = new Set(["4B", "5C", "6E", "7D", "8B", "8E"]);

  // Calculate fees including class selection
  const fareDiff = selectedNewFlight?.diff || 0;
  const seatFee = selectedNewSeat.endsWith("A") || selectedNewSeat.endsWith("F") ? 5 : 0;
  const changeFee = 15;
  const classFee = selectedNewFareClass === "business" ? 50 : 0;
  const totalExtra = changeFee + fareDiff + seatFee + classFee;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setStep("details");
    }, 1000);
  };

  const handleRefundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setActionType("refund");
      setStep("success");
    }, 1200);
  };

  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setActionType("reschedule");
      setStep("success");
    }, 1250);
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Đổi lịch & Hoàn vé">
      <div className="p-5 text-slate-800 dark:text-slate-100 max-h-[85vh] overflow-y-auto">
        {step === "search" && (
          <form onSubmit={handleSearch} className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-2">Nhập mã đặt chỗ và họ khách hàng để tìm kiếm thông tin đơn hàng.</p>
            <InputField label="Mã đặt chỗ (e.g. VTA8X1)" value={bookingRef} onChange={setBookingRef} placeholder="VTAxxx" required />
            <InputField label="Họ hành khách (Không dấu)" value={lastName} onChange={setLastName} placeholder="NGUYEN" required />
            <button 
              type="submit" 
              disabled={submitting}
              className="w-full bg-primary dark:bg-accent text-white dark:text-primary py-3 rounded-xl text-sm font-bold shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer mt-6"
            >
              {submitting ? (
                <motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}} className="w-4 h-4 border-2 border-white dark:border-primary border-t-transparent rounded-full" />
              ) : "Tìm kiếm đơn đặt chỗ"}
            </button>
          </form>
        )}

        {step === "details" && (
          <div className="space-y-4">
            {/* Ticket Info */}
            <div className="bg-slate-50 dark:bg-[#00223f] border border-slate-150 dark:border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-200/50 dark:border-slate-800 pb-2">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase">Mã đặt chỗ: {bookingRef.toUpperCase() || "VTAD3F"}</span>
                <span className="bg-primary/10 dark:bg-accent/10 text-primary dark:text-accent rounded-full px-3 py-0.5 text-[10px] font-bold">Vé đã xác nhận</span>
              </div>
              <div className="text-xs font-bold space-y-1">
                <div>Chặng bay: <span className="text-[#004b87] dark:text-accent">TP. Hồ Chí Minh (SGN) → Phú Quốc (PQC)</span></div>
                <div>Hành khách: <span className="uppercase">{lastName ? `${lastName} NGUYEN` : "NGUYỄN VĂN MINH"}</span></div>
                <div>Ngày bay xuất phát: <span className="text-slate-600 dark:text-slate-300">14 tháng 7, 2026 (08:35)</span></div>
                <div>Hãng vận chuyển: <span className="text-slate-600 dark:text-slate-300">Vietravel Airlines (VU751)</span></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button 
                type="button"
                onClick={() => setStep("refundForm")}
                className="bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 border border-red-200 dark:border-red-500/25 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Yêu cầu hoàn vé
              </button>
              <button 
                type="button"
                onClick={() => setStep("rescheduleForm")}
                className="bg-blue-50 hover:bg-blue-100 dark:bg-[#00223f] dark:hover:bg-slate-800 text-[#004b87] dark:text-accent border border-blue-200 dark:border-[#EAA135]/30 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Yêu cầu đổi lịch bay
              </button>
            </div>
          </div>
        )}

        {step === "refundForm" && (
          <form onSubmit={handleRefundSubmit} className="space-y-4">
            <p className="text-xs text-slate-555 dark:text-slate-400 font-semibold mb-2">Vui lòng chọn lý do và điền thông tin tài khoản ngân hàng để nhận tiền hoàn.</p>
            <SelectField label="Lý do yêu cầu hoàn vé" value={refundReason} onChange={setRefundReason} options={["Thay đổi lịch trình cá nhân", "Lý do sức khỏe", "Hãng thay đổi lịch bay > 4 tiếng", "Lý do bất khả kháng khác"]} placeholder="Chọn lý do..." required />
            <InputField label="Tên chủ tài khoản nhận hoàn tiền" placeholder="NGUYEN VAN MINH" required />
            <InputField label="Số tài khoản ngân hàng" placeholder="123456xxx" required />
            <InputField label="Tên ngân hàng (e.g. SHB, VCB)" placeholder="SHB" required />
            
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setStep("details")} className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer">Quay lại</button>
              <button type="submit" disabled={submitting} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer">
                {submitting ? <motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : "Gửi yêu cầu hoàn vé"}
              </button>
            </div>
          </form>
        )}

        {step === "rescheduleForm" && (
          <div className="space-y-4 pb-64"> {/* pb-64 prevents calendar clipping */}
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-2">Chọn ngày khởi hành mới mong muốn đổi lịch.</p>
            <CalPicker label="Chọn ngày bay mới" value={newDate} onChange={setNewDate} />
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setStep("details")} className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer">Quay lại</button>
              <button 
                type="button" 
                disabled={!newDate} 
                onClick={() => setStep("rescheduleFlight")}
                className="flex-1 bg-primary dark:bg-accent text-white dark:text-primary py-3 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tiếp tục chọn chuyến
              </button>
            </div>
          </div>
        )}

        {step === "rescheduleFlight" && (
          <div className="space-y-4 pb-20">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-2">Chọn chuyến bay mới vào ngày {newDate}:</p>
            <div className="space-y-3">
              {SIMULATED_FLIGHTS.filter(fl => !selectedNewFlight || selectedNewFlight.code === fl.code).map(fl => (
                <button
                  key={fl.code}
                  type="button"
                  onClick={() => setSelectedNewFlight(fl)}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 cursor-pointer",
                    selectedNewFlight?.code === fl.code 
                      ? "border-primary bg-blue-50/50 dark:border-accent dark:bg-[#00223f] shadow-md"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-[#004b87] dark:text-accent">{fl.code}</span>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded font-bold">{fl.time}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-semibold">{fl.desc}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                      {fl.diff === 0 ? "Không đổi" : `+$${fl.diff}`}
                    </div>
                    <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Chênh lệch</div>
                  </div>
                </button>
              ))}
            </div>

            {selectedNewFlight && (
              <div className="text-right -mt-1">
                <button
                  type="button"
                  onClick={() => { setSelectedNewFlight(null); setSelectedNewSeat(""); }}
                  className="text-xs text-primary dark:text-accent font-bold hover:underline cursor-pointer"
                >
                  Đổi sang chuyến bay khác
                </button>
              </div>
            )}

            {selectedNewFlight && (
              <div className="mt-4 p-4 bg-slate-50 dark:bg-[#00223f] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200">Chọn hạng vé mới mong muốn:</div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedNewFareClass("economy")}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all cursor-pointer",
                      selectedNewFareClass === "economy"
                        ? "border-primary bg-blue-50/50 dark:border-accent dark:bg-[#001c2e] shadow-sm"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                    )}
                  >
                    <div className="text-xs font-extrabold text-slate-850 dark:text-slate-200">Phổ thông (Economy)</div>
                    <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Không mất phí chênh lệch hạng</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedNewFareClass("business")}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all cursor-pointer",
                      selectedNewFareClass === "business"
                        ? "border-primary bg-blue-50/50 dark:border-accent dark:bg-[#001c2e] shadow-sm"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                    )}
                  >
                    <div className="text-xs font-extrabold text-slate-850 dark:text-slate-200">Thương gia (Business)</div>
                    <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Nâng hạng: +$50</div>
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setStep("rescheduleForm")} className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer">Quay lại</button>
              <button 
                type="button" 
                disabled={!selectedNewFlight}
                onClick={() => setStep("rescheduleSeat")}
                className="flex-1 bg-primary dark:bg-accent text-white dark:text-primary py-3 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tiếp tục chọn ghế
              </button>
            </div>
          </div>
        )}

        {step === "rescheduleSeat" && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-2">Chọn ghế ngồi mới của bạn:</p>
            <div className="flex justify-center mb-4">
              <div className="grid grid-cols-6 gap-2 bg-slate-50 dark:bg-[#00223f] border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
                {MINI_ROWS.flatMap(r => 
                  MINI_COLS.map(c => {
                    const seat = `${r}${c}`;
                    const occupied = MINI_OCCUPIED.has(seat);
                    const selected = selectedNewSeat === seat;
                    return (
                      <button
                        key={seat}
                        type="button"
                        disabled={occupied}
                        onClick={() => setSelectedNewSeat(seat)}
                        className={cn(
                          "w-8 h-8 rounded-lg border text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center",
                          occupied 
                            ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-900 text-slate-300 dark:text-slate-600 cursor-not-allowed"
                            : selected
                              ? "bg-primary border-primary text-white shadow-md"
                              : "bg-white dark:bg-card border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800"
                        )}
                      >
                        {seat}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            <div className="text-[10px] text-slate-400 text-center font-semibold mb-4">Lưu ý: Ghế cửa sổ (A, F) tính thêm phí dịch vụ +$5.</div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setStep("rescheduleFlight")} className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer">Quay lại</button>
              <button 
                type="button" 
                disabled={!selectedNewSeat}
                onClick={() => setStep("reschedulePayment")}
                className="flex-1 bg-primary dark:bg-accent text-white dark:text-primary py-3 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tiếp tục thanh toán
              </button>
            </div>
          </div>
        )}

        {step === "reschedulePayment" && (
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-[#00223f] border border-slate-150 dark:border-slate-800 rounded-2xl p-4 space-y-2">
              <h4 className="text-xs font-bold border-b border-slate-200/50 dark:border-slate-800 pb-2">Chi tiết chi phí chênh lệch:</h4>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Phí đổi ngày bay cố định:</span>
                <span className="font-bold font-mono">$15</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Chênh lệch giá vé chuyến {selectedNewFlight?.code}:</span>
                <span className="font-bold font-mono">${fareDiff}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Phí dịch vụ chọn ghế {selectedNewSeat}:</span>
                <span className="font-bold font-mono">${seatFee}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Nâng hạng vé ({selectedNewFareClass === "business" ? "Thương gia" : "Phổ thông"}):</span>
                <span className="font-bold font-mono">${classFee}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold border-t border-slate-200/50 dark:border-slate-800 pt-2 text-[#f26722]">
                <span>Tổng chi phí thanh toán thêm:</span>
                <span className="font-mono">${totalExtra}</span>
              </div>
            </div>

            {/* Payment method selector */}
            <div className="space-y-2">
              <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Chọn phương thức thanh toán</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "qr", name: "Quét mã VNPAY" },
                  { id: "card", name: "Thẻ Quốc tế" }
                ].map(pm => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setReschedulePaymentMethod(pm.id)}
                    className={cn(
                      "p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                      reschedulePaymentMethod === pm.id
                        ? "bg-[#004b87] text-white border-[#004b87] dark:bg-accent dark:text-primary dark:border-accent"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-900 text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                  >
                    {pm.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setStep("rescheduleSeat")} className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer">Quay lại</button>
              <button 
                type="button" 
                onClick={handleRescheduleSubmit}
                className="flex-1 bg-primary dark:bg-accent text-white dark:text-primary py-3 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? <motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}} className="w-4 h-4 border-2 border-white dark:border-primary border-t-transparent rounded-full" /> : `Thanh toán $${totalExtra}`}
              </button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="text-center space-y-3 py-6">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Check size={32} />
            </div>
            <h3 className="text-slate-800 dark:text-slate-100 font-extrabold text-lg">
              {actionType === "refund" ? "Gửi yêu cầu hoàn vé thành công!" : "Đổi lịch bay thành công!"}
            </h3>
            <p className="text-slate-555 dark:text-slate-450 text-xs font-semibold px-4 leading-relaxed">
              {actionType === "refund" 
                ? "Yêu cầu đã được tiếp nhận. Tiền hoàn sẽ được xử lý vào tài khoản của quý khách trong vòng 3-5 ngày làm việc."
                : `Lịch bay mới đã được xác nhận sang ngày ${newDate} trên chuyến bay ${selectedNewFlight?.code} (Hạng vé: ${selectedNewFareClass === "business" ? "Thương gia" : "Phổ thông"}, Giờ bay: ${selectedNewFlight?.time}). Ghế ngồi mới của quý khách là ${selectedNewSeat}. Vé điện tử mới đã được gửi tới email.`}
            </p>
            <div className="flex gap-3 justify-center pt-6">
              {actionType === "reschedule" && (
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(lastName ? `${lastName} NGUYEN` : "NGUYỄN VĂN MINH", selectedNewFlight?.code || "VU751", selectedNewSeat || "—", bookingRef, totalExtra)}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  Tải vé PDF mới
                </button>
              )}
              <button 
                type="button"
                onClick={onClose}
                className="bg-primary dark:bg-accent text-white dark:text-primary px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function LookupTicketModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSearched(true);
      setResults([
        { pnr: "VTA8X1", route: "TP. Hồ Chí Minh (SGN) → Phú Quốc (PQC)", date: "14/07/2026", time: "08:35", flight: "VU751", seat: "4A", price: 120, name: "NGUYEN VAN MINH" },
        { pnr: "VTA9Y2", route: "Hà Nội (HAN) → Đà Nẵng (DAD)", date: "20/07/2026", time: "10:15", flight: "VU753", seat: "5D", price: 145, name: "NGUYEN VAN MINH" }
      ]);
    }, 1000);
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Tra cứu vé qua SĐT">
      <div className="p-5 text-slate-800 dark:text-slate-100 max-h-[80vh] overflow-y-auto">
        {!searched ? (
          <form onSubmit={handleLookup} className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-2">Nhập số điện thoại đã sử dụng khi đặt vé để tra cứu toàn bộ danh sách vé.</p>
            <InputField label="Số điện thoại" value={phone} onChange={setPhone} placeholder="09xxxxxxxx" type="tel" required />
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary dark:bg-accent text-white dark:text-primary py-3 rounded-xl text-sm font-bold shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer mt-6"
            >
              {loading ? (
                <motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}} className="w-4 h-4 border-2 border-white dark:border-primary border-t-transparent rounded-full" />
              ) : "Tra cứu danh sách vé"}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-2">Tìm thấy {results.length} vé đặt dưới số điện thoại {phone}:</p>
            <div className="space-y-3">
              {results.map(ticket => (
                <div key={ticket.pnr} className="bg-slate-50 dark:bg-[#00223f] border border-slate-150 dark:border-slate-800 rounded-2xl p-4 space-y-2 shadow-sm">
                  <div className="flex justify-between items-center border-b border-slate-200/50 dark:border-slate-850 pb-2">
                    <span className="text-xs font-bold text-[#004b87] dark:text-accent font-mono">{ticket.pnr}</span>
                    <span className="text-[10px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-bold">Đã xác nhận</span>
                  </div>
                  <div className="text-xs space-y-1 font-bold">
                    <div>Hành trình: <span className="text-slate-600 dark:text-slate-200">{ticket.route}</span></div>
                    <div>Chuyến bay: <span className="text-slate-600 dark:text-slate-200">{ticket.flight} (Ghế {ticket.seat})</span></div>
                    <div>Thời gian: <span className="text-slate-600 dark:text-slate-200">{ticket.date} ({ticket.time})</span></div>
                    <div>Hành khách: <span className="text-slate-600 dark:text-slate-200 uppercase">{ticket.name}</span></div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleDownloadPDF(ticket.name, ticket.flight, ticket.seat, ticket.pnr, ticket.price)}
                      className="flex-1 bg-white hover:bg-slate-100 border border-slate-200 dark:border-slate-850 dark:bg-card dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                    >
                      Tải vé PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-4">
              <button 
                type="button" 
                onClick={() => { setSearched(false); setPhone(""); }}
                className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Tra cứu số khác
              </button>
              <button 
                type="button" 
                onClick={onClose}
                className="flex-1 bg-primary dark:bg-accent text-white dark:text-primary py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function App() {
  const [step,setStep]=useState(0);
  const [state,setRaw]=useState<BookingState>(INIT);
  function setState(p:Partial<BookingState>){ setRaw(prev=>{ const n={...prev,...p}; n.totalPrice=n.baseFare+n.taxFee+n.ancillaryFee; return n; }); }
  const [authModal, setAuthModal] = useState<"signin" | "signup" | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [lookupOpen, setLookupOpen] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (saved === "dark" || (!saved && prefersDark)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  return (
    <div className="w-full min-h-screen bg-background text-foreground" style={{fontFamily:"'Inter', sans-serif",scrollbarWidth:"none"}}>
      <style>{`::-webkit-scrollbar{display:none}*{scrollbar-width:none}`}</style>
      <AnimatePresence mode="wait">
        {step===0&&<motion.div key="s0" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0,x:-16}} transition={{duration:0.22}}><Homepage state={state} setState={setState} onSearch={()=>setStep(1)} onAuth={(m) => setAuthModal(m)} onRefund={() => setRefundOpen(true)} onLookup={() => setLookupOpen(true)}/></motion.div>}
        {step===1&&<motion.div key="s1" initial={{opacity:0,x:16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-16}} transition={{duration:0.22}}><SelectFlight state={state} setState={setState} onNext={()=>setStep(2)} onBack={()=>setStep(0)}/></motion.div>}
        {step===2&&<motion.div key="s2" initial={{opacity:0,x:16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-16}} transition={{duration:0.22}}><Details state={state} setState={setState} onNext={()=>setStep(3)} onBack={()=>setStep(1)}/></motion.div>}
        {step===3&&<motion.div key="s3" initial={{opacity:0,x:16}} animate={{opacity:1,x:0}} exit={{opacity:0}} transition={{duration:0.22}}><Payment state={state} onBack={()=>setStep(2)}/></motion.div>}
      </AnimatePresence>
      <AuthModal open={authModal !== null} mode={authModal} onClose={() => setAuthModal(null)} onSwitch={(m) => setAuthModal(m)} />
      <RefundRescheduleModal open={refundOpen} onClose={() => setRefundOpen(false)} />
      <LookupTicketModal open={lookupOpen} onClose={() => setLookupOpen(false)} />
    </div>
  );
}
