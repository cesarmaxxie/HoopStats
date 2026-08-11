import React, { useState, useRef, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from "recharts";
import {
  Trophy, Users, GitCompare, ChevronLeft, Plus, Upload, FileUp, Check, ChevronRight,
  Settings, ArrowLeft, Sparkles, AlertCircle, Shuffle, ShieldCheck, UserCircle, Lock, Trash2, Pencil, LogOut
} from "lucide-react";
import { db, auth } from "./firebase";
import { collection, doc, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";

const PALETTE = ["#E8A33D", "#E4483C", "#3DDC84", "#5B8DEF", "#C77DFF", "#4CC9F0", "#F72585", "#90BE6D"];
const FORMATS = ["Fase de grupos + mata-mata", "Todos contra todos", "Mata-mata direto", "Soma de pontos (pontos corridos)"];
const PHASE_LABEL = { grupos: "Fase de Grupos", semis: "Semifinal", final: "Final" };

const SEED_TEAMS = [
  { id: "trovao", name: "Trovão", color: "#E8A33D" }, { id: "furia", name: "Fúria", color: "#E4483C" },
  { id: "unidos", name: "Unidos", color: "#3DDC84" }, { id: "alfa", name: "Bloco Alfa", color: "#5B8DEF" },
];
const SEED_PLAYERS = [
  { id: "p1", name: "Cesar M.", teamId: "trovao" }, { id: "p2", name: "Rafael S.", teamId: "trovao" }, { id: "p3", name: "Diego F.", teamId: "trovao" },
  { id: "p4", name: "Bruno L.", teamId: "furia" }, { id: "p5", name: "Thiago R.", teamId: "furia" }, { id: "p6", name: "Marcelo A.", teamId: "furia" },
  { id: "p7", name: "André P.", teamId: "unidos" }, { id: "p8", name: "Felipe C.", teamId: "unidos" }, { id: "p9", name: "Gustavo N.", teamId: "unidos" },
  { id: "p10", name: "Lucas T.", teamId: "alfa" }, { id: "p11", name: "Rodrigo M.", teamId: "alfa" }, { id: "p12", name: "Vinícius O.", teamId: "alfa" },
];
const SEED_GAMES = [
  { id: "g1", phase: "grupos", teamA: "trovao", teamB: "furia", scoreA: 58, scoreB: 47,
    stats: { p1: { pts: 22, fouls: 2 }, p2: { pts: 18, fouls: 3 }, p3: { pts: 10, fouls: 1 }, p4: { pts: 19, fouls: 2 }, p5: { pts: 15, fouls: 4 }, p6: { pts: 8, fouls: 1 } } },
  { id: "g2", phase: "grupos", teamA: "unidos", teamB: "alfa", scoreA: 52, scoreB: 55,
    stats: { p7: { pts: 20, fouls: 1 }, p8: { pts: 14, fouls: 3 }, p9: { pts: 12, fouls: 2 }, p10: { pts: 24, fouls: 2 }, p11: { pts: 16, fouls: 1 }, p12: { pts: 9, fouls: 3 } } },
  { id: "g3", phase: "grupos", teamA: "trovao", teamB: "unidos", scoreA: 61, scoreB: 44,
    stats: { p1: { pts: 25, fouls: 3 }, p2: { pts: 15, fouls: 2 }, p3: { pts: 14, fouls: 1 }, p7: { pts: 18, fouls: 2 }, p8: { pts: 13, fouls: 4 }, p9: { pts: 10, fouls: 1 } } },
  { id: "g4", phase: "grupos", teamA: "furia", teamB: "alfa", scoreA: 50, scoreB: 53,
    stats: { p4: { pts: 17, fouls: 2 }, p5: { pts: 13, fouls: 3 }, p6: { pts: 12, fouls: 1 }, p10: { pts: 21, fouls: 1 }, p11: { pts: 15, fouls: 2 }, p12: { pts: 11, fouls: 2 } } },
  { id: "g5", phase: "semis", teamA: "trovao", teamB: "alfa", scoreA: 49, scoreB: 45,
    stats: { p1: { pts: 20, fouls: 2 }, p2: { pts: 12, fouls: 4 }, p3: { pts: 9, fouls: 1 }, p10: { pts: 18, fouls: 2 }, p11: { pts: 14, fouls: 3 }, p12: { pts: 8, fouls: 1 } } },
  { id: "g5b", phase: "semis", teamA: "furia", teamB: "unidos", scoreA: 46, scoreB: 40,
    stats: { p4: { pts: 16, fouls: 2 }, p5: { pts: 15, fouls: 3 }, p6: { pts: 10, fouls: 1 }, p7: { pts: 14, fouls: 2 }, p8: { pts: 12, fouls: 3 }, p9: { pts: 9, fouls: 1 } } },
  { id: "g6", phase: "final", teamA: "trovao", teamB: "furia", scoreA: 57, scoreB: 52,
    stats: { p1: { pts: 24, fouls: 3 }, p2: { pts: 16, fouls: 2 }, p3: { pts: 11, fouls: 1 }, p4: { pts: 20, fouls: 2 }, p5: { pts: 14, fouls: 3 }, p6: { pts: 10, fouls: 2 } } },
];
const SEED_CHAMPIONSHIP = { id: "jda-2026", name: "Jogos da Amizade — Ed. 2026", format: FORMATS[0], status: "ativo", startDate: "2026-06-01", teams: SEED_TEAMS, players: SEED_PLAYERS, games: SEED_GAMES, fixtures: [] };

// ---------- PARSER DO HTML DA SÚMULA ----------
function parseSumulaHtml(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const scoreText = doc.querySelector(".score")?.textContent?.trim() || "";
  const m = scoreText.match(/^(.*?)\s+(\d+)\s+[×x]\s+(\d+)\s+(.*)$/);
  if (!m) throw new Error("placar não reconhecido");
  const [, labelA, scoreAStr, scoreBStr, labelB] = m;
  const tables = Array.from(doc.querySelectorAll("table"));
  const rosterTables = tables.filter((t) => {
    const headers = Array.from(t.querySelectorAll("th")).map((th) => th.textContent.trim());
    return headers.includes("Pts") && headers.includes("R.Tot");
  });
  if (rosterTables.length < 2) throw new Error("tabelas de jogadores não encontradas");
  function parseRoster(table) {
    return Array.from(table.querySelectorAll("tbody tr")).map((tr) => {
      const cells = Array.from(tr.querySelectorAll("td")).map((td) => td.textContent.trim());
      return { rawName: cells[0].replace(/EXPULSO/i, "").trim(), pts: parseInt(cells[1]) || 0, fouls: parseInt(cells[2]) || 0, tech: parseInt(cells[3]) || 0, ast: parseInt(cells[4]) || 0, rOff: parseInt(cells[5]) || 0, rDef: parseInt(cells[6]) || 0, rTot: parseInt(cells[7]) || 0 };
    });
  }
  return { labelA: labelA.trim(), labelB: labelB.trim(), scoreA: parseInt(scoreAStr, 10), scoreB: parseInt(scoreBStr, 10), dateText: (doc.querySelector(".muted")?.textContent || "").trim(), rosterA: parseRoster(rosterTables[0]), rosterB: parseRoster(rosterTables[1]) };
}

// ---------- SORTEIO ----------
function drawFixtures(teams, format) {
  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  if (format === "Mata-mata direto") {
    const fixtures = [];
    for (let i = 0; i < shuffled.length - 1; i += 2) fixtures.push({ id: "f" + i, phase: "semis", teamA: shuffled[i].id, teamB: shuffled[i + 1].id });
    return fixtures;
  }
  if (format === "Fase de grupos + mata-mata" || format === "Todos contra todos") {
    const fixtures = [];
    for (let i = 0; i < shuffled.length; i++) for (let j = i + 1; j < shuffled.length; j++) fixtures.push({ id: "f" + i + "_" + j, phase: "grupos", teamA: shuffled[i].id, teamB: shuffled[j].id });
    return fixtures;
  }
  return [];
}

// ---------- HELPERS PUROS (recebem os dados do campeonato ativo) ----------
const findTeam = (teams, id) => teams.find((t) => t.id === id) || { id, name: id, color: "#8A8F98" };
const playerOf = (players, id) => players.find((p) => p.id === id);

function getStandings(games, teams, phase) {
  const relevant = games.filter((g) => g.phase === phase);
  const table = {};
  teams.forEach((t) => (table[t.id] = { team: t, w: 0, l: 0, pf: 0, pa: 0 }));
  relevant.forEach((g) => {
    if (!table[g.teamA] || !table[g.teamB]) return;
    table[g.teamA].pf += g.scoreA; table[g.teamA].pa += g.scoreB;
    table[g.teamB].pf += g.scoreB; table[g.teamB].pa += g.scoreA;
    if (g.scoreA > g.scoreB) { table[g.teamA].w++; table[g.teamB].l++; } else { table[g.teamB].w++; table[g.teamA].l++; }
  });
  return Object.values(table).sort((a, b) => b.w - a.w || (b.pf - b.pa) - (a.pf - a.pa));
}
function getPlayerAgg(games, players, playerId) {
  const relevant = games.filter((g) => g.stats[playerId]);
  if (!relevant.length) return null;
  const totals = relevant.reduce((acc, g) => { const s = g.stats[playerId]; acc.pts += s.pts || 0; acc.fouls += s.fouls || 0; acc.ast += s.ast || 0; acc.reb += s.rTot || 0; return acc; }, { pts: 0, fouls: 0, ast: 0, reb: 0 });
  const n = relevant.length;
  const myTeam = playerOf(players, playerId)?.teamId;
  return { games: n, avgPts: +(totals.pts / n).toFixed(1), avgFouls: +(totals.fouls / n).toFixed(1), avgAst: +(totals.ast / n).toFixed(1), avgReb: +(totals.reb / n).toFixed(1),
    log: relevant.map((g) => ({ fase: PHASE_LABEL[g.phase] || g.phase, adversario: findTeam([], g.teamA).name, teamId: g.teamA === myTeam ? g.teamB : g.teamA, PTS: g.stats[playerId].pts, FALTAS: g.stats[playerId].fouls })) };
}
function getTeamSummary(games, teams, teamId) {
  const relevant = games.filter((g) => g.teamA === teamId || g.teamB === teamId);
  let pf = 0, pa = 0, w = 0, l = 0;
  const log = relevant.map((g) => {
    const isA = g.teamA === teamId; const scored = isA ? g.scoreA : g.scoreB, conceded = isA ? g.scoreB : g.scoreA;
    pf += scored; pa += conceded; if (scored > conceded) w++; else l++;
    return { adversario: findTeam(teams, isA ? g.teamB : g.teamA).name, PTS: scored, SOFRIDOS: conceded, win: scored > conceded };
  });
  const n = relevant.length || 1;
  return { games: relevant.length, wins: w, losses: l, avgPF: +(pf / n).toFixed(1), avgPA: +(pa / n).toFixed(1), diff: +((pf - pa) / n).toFixed(1), log };
}
function teamInsight(games, players, teamId) {
  const roster = players.filter((p) => p.teamId === teamId).map((p) => ({ player: p, agg: getPlayerAgg(games, players, p.id) })).filter((x) => x.agg).sort((a, b) => b.agg.avgPts - a.agg.avgPts);
  if (!roster.length) return { roster: [], text: "Ainda não há jogos suficientes desse time pra gerar um destaque." };
  const totalAvg = roster.reduce((s, r) => s + r.agg.avgPts, 0);
  const top = roster[0];
  const share = totalAvg ? Math.round((top.agg.avgPts / totalAvg) * 100) : 0;
  const foulLeader = [...roster].sort((a, b) => b.agg.avgFouls - a.agg.avgFouls)[0];
  let text = share >= 35 ? `${top.player.name} concentra cerca de ${share}% dos pontos médios do time — travar ele muda o jogo.` : `Ataque bem distribuído: ${top.player.name} lidera com ${top.agg.avgPts} pts/jogo, sem um jogador claramente dominante.`;
  if (foulLeader && foulLeader.agg.avgFouls >= 2.5) text += ` ${foulLeader.player.name} costuma cometer bastante falta (${foulLeader.agg.avgFouls}/jogo) — vale atacar o aro contra ele.`;
  return { roster: roster.slice(0, 3), text };
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Manrope:wght@400;600;800&display=swap');
  .font-display { font-family: 'Oswald', sans-serif; } .tabular { font-variant-numeric: tabular-nums; }
  .surface { background: #1B1F27; } .card { background: #20242D; border: 1px solid #2A2F3A; }
  .card-btn { background: #20242D; border: 1px solid #2A2F3A; transition: background .15s, border-color .15s; cursor: pointer; }
  .card-btn:hover { background: #262B36; border-color: #3A4050; } .card-btn:disabled { opacity: .4; cursor: default; }
  .row-btn { transition: background .15s; cursor: pointer; } .row-btn:hover { background: #20242D; }
  .input-dark { background: #0F1115; border: 1px solid #2A2F3A; color: #F2F0EA; }
  .dash { border: 2px dashed #3A4050; transition: border-color .15s, color .15s; cursor: pointer; } .dash:hover { border-color: #E8A33D; color: #F2F0EA; }
  .amber-btn { background: #E8A33D; color: #14171C; transition: filter .15s; cursor: pointer; } .amber-btn:hover { filter: brightness(1.1); } .amber-btn:disabled { opacity: .4; cursor: default; filter: none; }
  .ghost-btn { background: transparent; border: 1px solid #2A2F3A; color: #F2F0EA; transition: background .15s; cursor: pointer; } .ghost-btn:hover { background: #20242D; }
  .muted { color: #8A8F98; } .faint { color: #5A606C; } .amber { color: #E8A33D; } .green { color: #3DDC84; } .red { color: #E4483C; }
  .badge-live { background: rgba(61,220,132,.15); color: #3DDC84; } .badge-draft { background: rgba(138,143,152,.15); color: #8A8F98; }
`;

export default function CampeonatoApp() {
  const [role, setRole] = useState(null); // null | 'admin' | 'user'
  const [championships, setChampionships] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [authedAdmin, setAuthedAdmin] = useState(null); // e-mail logado, ou null
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwdError, setPwdError] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Escuta em tempo real a coleção "championships" no Firestore — todo mundo
  // que tiver o app aberto (admin ou participante) vê as mesmas atualizações.
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "championships"), (snap) => {
      setChampionships(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingData(false);
    }, () => setLoadingData(false));
    return () => unsub();
  }, []);

  // Mantém o login do administrador entre recarregamentos de página.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setAuthedAdmin(user ? user.email : null));
    return () => unsub();
  }, []);

  async function tryAdminLogin() {
    setAuthLoading(true); setPwdError(false);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pwd);
      setRole("admin"); setAdminLoginOpen(false); setPwd("");
    } catch (err) {
      setPwdError(true);
    } finally {
      setAuthLoading(false);
    }
  }

  function adminLogout() {
    signOut(auth);
    setRole(null);
  }

  // Grava um campeonato inteiro no Firestore (cria ou atualiza, id = nome do documento).
  async function saveChampionship(champ) {
    await setDoc(doc(db, "championships", champ.id), champ);
  }
  async function removeChampionship(id) {
    await deleteDoc(doc(db, "championships", id));
  }

  const updateChamp = (id, updater) => {
    const current = championships.find((c) => c.id === id);
    if (!current) return;
    saveChampionship(updater(current));
  };
  const active = championships.find((c) => c.id === activeId) || null;

  const shell = (children) => (
    <div className="relative w-full" style={{ minHeight: 700, background: "#14171C", color: "#F2F0EA", fontFamily: "Manrope, sans-serif" }}>
      <style>{CSS}</style>{children}
    </div>
  );

  if (adminLoginOpen) {
    // Se já existe uma sessão válida do Firebase (ex: recarregou a página), pula direto.
    if (authedAdmin) { setRole("admin"); setAdminLoginOpen(false); }
    return shell(
      <div className="px-6 py-10 flex flex-col items-center text-center">
        <Lock size={28} className="amber mb-3" />
        <div className="text-xs tracking-widest muted font-display uppercase mb-1">Área restrita</div>
        <h1 className="font-display text-xl font-semibold uppercase mb-6">Login de administrador</h1>
        <div className="max-w-xs w-full">
          <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setPwdError(false); }}
            placeholder="E-mail" autoFocus className="input-dark rounded-md px-3 py-2.5 text-sm w-full mb-2" />
          <input type="password" value={pwd} onChange={(e) => { setPwd(e.target.value); setPwdError(false); }} onKeyDown={(e) => e.key === "Enter" && tryAdminLogin()}
            placeholder="Senha" className="input-dark rounded-md px-3 py-2.5 text-sm w-full mb-2" />
          {pwdError && <div className="text-sm red mb-2 text-left">E-mail ou senha incorretos.</div>}
          <button type="button" onClick={tryAdminLogin} disabled={authLoading} className="amber-btn w-full font-display font-semibold uppercase text-sm px-4 py-2.5 rounded-md mb-2">{authLoading ? "Entrando..." : "Entrar"}</button>
          <button type="button" onClick={() => { setAdminLoginOpen(false); setPwd(""); setPwdError(false); }} className="ghost-btn w-full text-xs font-display uppercase px-3 py-2 rounded-md">Cancelar</button>
        </div>
      </div>
    );
  }

  if (loadingData) return shell(<div className="px-6 py-10 text-center text-sm muted">Carregando campeonatos…</div>);

  if (!role) {
    return shell(
      <div className="px-6 py-10 flex flex-col items-center text-center">
        <div className="text-xs tracking-widest muted font-display uppercase mb-2">Jogos da Amizade</div>
        <h1 className="font-display text-2xl font-semibold uppercase mb-8">Entrar como...</h1>
        <div className="grid grid-cols-2 gap-4 max-w-md w-full">
          <button type="button" onClick={() => setAdminLoginOpen(true)} className="card-btn rounded-lg p-6 flex flex-col items-center gap-2">
            <Lock size={20} className="amber" /><span className="font-display uppercase text-sm">Administrador</span><span className="text-xs faint">Requer senha</span>
          </button>
          <button type="button" onClick={() => setRole("user")} className="card-btn rounded-lg p-6 flex flex-col items-center gap-2">
            <UserCircle size={24} /><span className="font-display uppercase text-sm">Participante</span><span className="text-xs faint">Só visualiza</span>
          </button>
        </div>
      </div>
    );
  }

  if (role === "admin" && !active) {
    return shell(<AdminList championships={championships} saveChampionship={saveChampionship} removeChampionship={removeChampionship} setActiveId={setActiveId} onExit={adminLogout} adminEmail={authedAdmin} />);
  }
  if (role === "user" && !active) {
    return shell(<PublicList championships={championships.filter((c) => c.status === "ativo")} setActiveId={setActiveId} onSwitchAdmin={() => setAdminLoginOpen(true)} />);
  }
  if (active) {
    return shell(<ChampionshipView champ={active} isAdmin={role === "admin"} onUpdate={(fn) => updateChamp(active.id, fn)} onBack={() => setActiveId(null)} />);
  }
  return null;
}

// ---------- ÁREA ADMIN: LISTA ----------
function AdminList({ championships, saveChampionship, removeChampionship, setActiveId, onExit, adminEmail }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  async function createDraft() {
    const id = "c_" + Date.now().toString(36);
    const draft = { id, name: "Novo campeonato", format: FORMATS[0], status: "rascunho", startDate: "", teams: [], players: [], games: [], fixtures: [] };
    await saveChampionship(draft);
    setActiveId(id);
  }
  async function deleteChampionship(id) {
    await removeChampionship(id);
    setConfirmDeleteId(null);
  }
  return (
    <div className="px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs tracking-widest muted font-display uppercase mb-1 flex items-center gap-1.5"><Lock size={11} /> Painel do administrador · {adminEmail}</div>
          <h1 className="font-display text-2xl font-semibold uppercase">Meus campeonatos</h1>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onExit} className="ghost-btn flex items-center gap-1.5 text-xs font-display uppercase px-3 py-2 rounded-md"><LogOut size={13} /> Sair</button>
          <button type="button" onClick={createDraft} className="amber-btn flex items-center gap-2 font-display font-semibold uppercase text-sm px-4 py-2.5 rounded-md"><Plus size={16} /> Novo campeonato</button>
        </div>
      </div>
      <div className="space-y-3 max-w-lg">
        {championships.map((c) => (
          <div key={c.id} className="card rounded-lg p-4">
            {confirmDeleteId === c.id ? (
              <div className="flex items-center justify-between">
                <span className="text-sm">Excluir <span className="font-semibold">{c.name}</span> definitivamente?</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => deleteChampionship(c.id)} className="text-xs font-display uppercase px-3 py-1.5 rounded-md" style={{ background: "#E4483C", color: "#fff" }}>Excluir</button>
                  <button type="button" onClick={() => setConfirmDeleteId(null)} className="ghost-btn text-xs font-display uppercase px-3 py-1.5 rounded-md">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setActiveId(c.id)} className="text-left flex-1 cursor-pointer">
                  <div className="font-display uppercase font-semibold">{c.name}</div>
                  <div className="text-xs muted">{c.format} · {c.teams.length} times</div>
                </button>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-display uppercase px-2 py-1 rounded ${c.status === "ativo" ? "badge-live" : "badge-draft"}`}>{c.status === "ativo" ? "Ativo" : "Rascunho"}</span>
                  <button type="button" onClick={() => setActiveId(c.id)} title="Editar" className="ghost-btn rounded-md p-2"><Pencil size={14} /></button>
                  <button type="button" onClick={() => setConfirmDeleteId(c.id)} title="Excluir" className="ghost-btn rounded-md p-2"><Trash2 size={14} className="red" /></button>
                </div>
              </div>
            )}
          </div>
        ))}
        {championships.length === 0 && <p className="text-sm faint">Nenhum campeonato criado ainda.</p>}
      </div>
    </div>
  );
}

// ---------- ÁREA PÚBLICA: LISTA ----------
function PublicList({ championships, setActiveId, onSwitchAdmin }) {
  return (
    <div className="px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs tracking-widest muted font-display uppercase mb-1">Campeonatos ativos</div>
          <h1 className="font-display text-2xl font-semibold uppercase">Meus campeonatos</h1>
        </div>
        <button type="button" onClick={onSwitchAdmin} className="ghost-btn text-xs font-display uppercase px-3 py-2 rounded-md">Sou administrador</button>
      </div>
      <div className="space-y-3 max-w-lg">
        {championships.map((c) => (
          <button key={c.id} type="button" onClick={() => setActiveId(c.id)} className="card-btn w-full text-left rounded-lg p-5 flex items-center justify-between">
            <div>
              <div className="font-display text-lg uppercase font-semibold mb-1">{c.name}</div>
              <div className="text-sm muted">{c.format} · {c.teams.length} times · {c.games.length} jogos registrados</div>
            </div>
            <ChevronRight size={20} className="muted" />
          </button>
        ))}
        {championships.length === 0 && <p className="text-sm faint">Nenhum campeonato ativo no momento.</p>}
      </div>
    </div>
  );
}

// ---------- VISTA DE UM CAMPEONATO (setup se rascunho; dashboard se ativo) ----------
function ChampionshipView({ champ, isAdmin, onUpdate, onBack }) {
  if (champ.status === "rascunho") {
    if (!isAdmin) return null; // participante nunca deveria chegar aqui
    return <SetupView champ={champ} onUpdate={onUpdate} onBack={onBack} />;
  }
  return <Dashboard champ={champ} isAdmin={isAdmin} onUpdate={onUpdate} onBack={onBack} />;
}

// ---------- SETUP (admin, antes de lançar) ----------
function SetupView({ champ, onUpdate, onBack }) {
  const [newTeamName, setNewTeamName] = useState("");
  function addTeam() {
    const name = newTeamName.trim(); if (!name) return;
    onUpdate((c) => ({ ...c, teams: [...c.teams, { id: name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now().toString(36).slice(-3), name, color: PALETTE[c.teams.length % PALETTE.length] }] }));
    setNewTeamName("");
  }
  function launch() {
    const fixtures = drawFixtures(champ.teams, champ.format);
    onUpdate((c) => ({ ...c, fixtures, status: "ativo" }));
  }
  return (
    <div className="px-6 py-6">
      <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm muted mb-4 cursor-pointer"><ArrowLeft size={15} /> Meus campeonatos</button>
      <div className="text-xs tracking-widest muted font-display uppercase mb-1">Configurar campeonato</div>
      <input value={champ.name} onChange={(e) => onUpdate((c) => ({ ...c, name: e.target.value }))} className="input-dark rounded-md px-3 py-2 text-xl font-display uppercase font-semibold w-full max-w-lg mb-6" />

      <div className="max-w-lg space-y-5">
        <div>
          <label className="text-xs faint uppercase font-display block mb-1">Formato</label>
          <select value={champ.format} onChange={(e) => onUpdate((c) => ({ ...c, format: e.target.value }))} className="input-dark rounded-md px-3 py-2 text-sm w-full">
            {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs faint uppercase font-display block mb-1">Data de início</label>
          <input type="date" value={champ.startDate} onChange={(e) => onUpdate((c) => ({ ...c, startDate: e.target.value }))} className="input-dark rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs faint uppercase font-display block mb-2">Times participantes ({champ.teams.length})</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {champ.teams.map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm card"><span className="w-2 h-2 rounded-full" style={{ background: t.color }} /> {t.name}</div>
            ))}
            {champ.teams.length === 0 && <span className="text-sm faint">Nenhum time ainda.</span>}
          </div>
          <div className="flex gap-2">
            <input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="Nome do time" className="input-dark rounded-md px-3 py-2 text-sm flex-1" onKeyDown={(e) => e.key === "Enter" && addTeam()} />
            <button type="button" onClick={addTeam} className="amber-btn rounded-md px-3 flex items-center gap-1 text-sm font-display font-semibold uppercase"><Plus size={16} /> Add</button>
          </div>
        </div>

        <button type="button" onClick={launch} disabled={champ.teams.length < 2} className="amber-btn w-full flex items-center justify-center gap-2 font-display font-semibold uppercase text-sm px-4 py-3 rounded-md mt-2">
          <Shuffle size={16} /> Sortear e lançar campeonato
        </button>
        <p className="text-xs faint">O sorteio distribui os times no chaveamento conforme o formato escolhido. Depois de lançado, o campeonato aparece pra todo mundo na lista pública.</p>
      </div>
    </div>
  );
}

// ---------- DASHBOARD (chaveamento / times / comparativo / resumo) ----------
function Dashboard({ champ, isAdmin, onUpdate, onBack }) {
  const { teams, players, games, fixtures, format } = champ;
  const [tab, setTab] = useState("bracket");
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [compareA, setCompareA] = useState(teams[0]?.id || "");
  const [compareB, setCompareB] = useState(teams[1]?.id || "");
  const [showHighlights, setShowHighlights] = useState(null);
  const [newTeamName, setNewTeamName] = useState("");

  const [importOpen, setImportOpen] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [parsedGame, setParsedGame] = useState(null);
  const [mapTeamA, setMapTeamA] = useState("");
  const [mapTeamB, setMapTeamB] = useState("");
  const [mapPhase, setMapPhase] = useState("grupos");
  const [imported, setImported] = useState(false);
  const fileInputRef = useRef(null);

  function addTeam() {
    const name = newTeamName.trim(); if (!name) return;
    onUpdate((c) => ({ ...c, teams: [...c.teams, { id: name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now().toString(36).slice(-3), name, color: PALETTE[c.teams.length % PALETTE.length] }] }));
    setNewTeamName("");
  }

  function handleFileChosen(e) {
    const f = e.target.files?.[0]; if (!f) return;
    setFileName(f.name); setParseError(null); setParsedGame(null); setImported(false);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseSumulaHtml(String(reader.result));
        setParsedGame(parsed); setMapTeamA(teams[0]?.id || ""); setMapTeamB(teams[1]?.id || "");
      } catch (err) { setParseError("Não consegui reconhecer esse arquivo como uma súmula exportada pelo app. Confirma se é o export .html correto."); }
    };
    reader.readAsText(f);
  }
  function resolvePlayerId(entry, teamId, nextPlayers) {
    const surname = entry.rawName.replace(/#\d+\s*/, "").trim().toLowerCase();
    const existing = nextPlayers.find((p) => p.teamId === teamId && p.name.toLowerCase().includes(surname));
    if (existing) return existing.id;
    const id = "p_" + teamId + "_" + surname.replace(/\s+/g, "") + "_" + Date.now().toString(36).slice(-3) + Math.floor(Math.random() * 99);
    nextPlayers.push({ id, name: entry.rawName, teamId }); return id;
  }
  function confirmImport() {
    if (!parsedGame || !mapTeamA || !mapTeamB || mapTeamA === mapTeamB) return;
    const nextPlayers = [...players]; const stats = {};
    parsedGame.rosterA.forEach((e) => { const id = resolvePlayerId(e, mapTeamA, nextPlayers); stats[id] = { pts: e.pts, fouls: e.fouls, tech: e.tech, ast: e.ast, rOff: e.rOff, rDef: e.rDef, rTot: e.rTot }; });
    parsedGame.rosterB.forEach((e) => { const id = resolvePlayerId(e, mapTeamB, nextPlayers); stats[id] = { pts: e.pts, fouls: e.fouls, tech: e.tech, ast: e.ast, rOff: e.rOff, rDef: e.rDef, rTot: e.rTot }; });
    const newGame = { id: "g_" + Date.now().toString(36), phase: mapPhase, teamA: mapTeamA, teamB: mapTeamB, scoreA: parsedGame.scoreA, scoreB: parsedGame.scoreB, stats };
    onUpdate((c) => ({ ...c, players: nextPlayers, games: [...c.games, newGame] }));
    setImported(true);
    setTimeout(() => { setImportOpen(false); setImported(false); setFileName(null); setParsedGame(null); setParseError(null); }, 1100);
  }

  const showBracket = format !== "Todos contra todos" && format !== "Soma de pontos (pontos corridos)";
  const groupStandings = getStandings(games, teams, "grupos");
  const semisGames = games.filter((g) => g.phase === "semis");
  const finalGame = games.find((g) => g.phase === "final");
  const semisFixtures = fixtures.filter((f) => f.phase === "semis");
  const grupoFixturesPendentes = fixtures.filter((f) => f.phase === "grupos" && !games.some((g) => (g.teamA === f.teamA && g.teamB === f.teamB) || (g.teamA === f.teamB && g.teamB === f.teamA)));
  const topScorers = players.map((p) => ({ player: p, agg: getPlayerAgg(games, players, p.id) })).filter((x) => x.agg).sort((a, b) => b.agg.avgPts - a.agg.avgPts).slice(0, 5);
  const teamsWithGames = teams.map((t) => ({ team: t, s: getTeamSummary(games, teams, t.id) })).filter((x) => x.s.games > 0);
  const bestAttack = teamsWithGames.slice().sort((a, b) => b.s.avgPF - a.s.avgPF)[0];
  const bestDefense = teamsWithGames.slice().sort((a, b) => a.s.avgPA - b.s.avgPA)[0];

  function bracketSlot(phase, idx) {
    const g = games.filter((x) => x.phase === phase)[idx];
    if (g) return { played: true, teamA: g.teamA, teamB: g.teamB, scoreA: g.scoreA, scoreB: g.scoreB };
    const fx = fixtures.filter((x) => x.phase === phase)[idx];
    if (fx) return { played: false, teamA: fx.teamA, teamB: fx.teamB };
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid #2A2F3A" }}>
        <div>
          <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-xs muted mb-1 cursor-pointer"><ArrowLeft size={13} /> {isAdmin ? "Meus campeonatos" : "Campeonatos"}</button>
          <h1 className="font-display text-2xl font-semibold tracking-tight uppercase">{champ.name}</h1>
        </div>
        {isAdmin && (
          <button type="button" onClick={() => setImportOpen((v) => !v)} className="amber-btn flex items-center gap-2 font-display font-semibold uppercase text-sm tracking-wide px-4 py-2.5 rounded-md">
            <Upload size={16} strokeWidth={2.5} /> Importar súmula
          </button>
        )}
      </div>

      {importOpen && isAdmin && (
        <div className="px-6 py-5 surface" style={{ borderBottom: "1px solid #2A2F3A" }}>
          {!parsedGame ? (
            <>
              <p className="text-sm muted mb-3">Selecione o arquivo .html exportado pelo app de súmula ao fim do jogo.</p>
              <div className="max-w-xl">
                <input ref={fileInputRef} type="file" accept=".html" onChange={handleFileChosen} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="dash w-full flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm muted">
                  <FileUp size={16} /> {fileName ? fileName : "Selecionar arquivo .html"}
                </button>
                {parseError && <div className="flex items-start gap-2 mt-3 text-sm red"><AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {parseError}</div>}
              </div>
            </>
          ) : (
            <div className="max-w-xl">
              <div className="card rounded-md p-3 mb-4 text-sm">Jogo encontrado: <span className="font-semibold">{parsedGame.labelA} {parsedGame.scoreA} x {parsedGame.scoreB} {parsedGame.labelB}</span>{parsedGame.dateText && <span className="muted"> — {parsedGame.dateText}</span>}</div>
              <p className="text-xs muted mb-3">A súmula não sabe o nome dos times do campeonato — só "{parsedGame.labelA}" e "{parsedGame.labelB}". Diga a quem eles correspondem:</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div><label className="text-xs faint uppercase font-display block mb-1">"{parsedGame.labelA}" é:</label>
                  <select value={mapTeamA} onChange={(e) => setMapTeamA(e.target.value)} className="input-dark rounded-md px-3 py-2 text-sm w-full">{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                <div><label className="text-xs faint uppercase font-display block mb-1">"{parsedGame.labelB}" é:</label>
                  <select value={mapTeamB} onChange={(e) => setMapTeamB(e.target.value)} className="input-dark rounded-md px-3 py-2 text-sm w-full">{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              </div>
              <div className="mb-4"><label className="text-xs faint uppercase font-display block mb-1">Fase:</label>
                <select value={mapPhase} onChange={(e) => setMapPhase(e.target.value)} className="input-dark rounded-md px-3 py-2 text-sm"><option value="grupos">Fase de Grupos</option><option value="semis">Semifinal</option><option value="final">Final</option></select></div>
              {mapTeamA === mapTeamB && <div className="text-sm red mb-3">Escolha dois times diferentes.</div>}
              <button type="button" onClick={confirmImport} disabled={mapTeamA === mapTeamB || imported} className="amber-btn flex items-center justify-center gap-2 font-display font-semibold uppercase text-sm tracking-wide px-4 py-2.5 rounded-md">
                {imported ? (<><Check size={16} /> Estatísticas atualizadas</>) : (<>Confirmar importação <ChevronRight size={16} /></>)}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-1 px-6 pt-4">
        {[{ id: "bracket", label: "Chaveamento", icon: Trophy }, { id: "teams", label: "Times", icon: Users }, { id: "compare", label: "Comparativo", icon: GitCompare }, { id: "resumo", label: "Resumo", icon: Sparkles }].map((t) => (
          <button key={t.id} type="button" onClick={() => { setTab(t.id); setSelectedTeam(null); setSelectedPlayer(null); }} className="flex items-center gap-2 px-4 py-2 rounded-t-md font-display uppercase text-sm tracking-wide transition cursor-pointer" style={{ background: tab === t.id ? "#1B1F27" : "transparent", color: tab === t.id ? "#E8A33D" : "#8A8F98" }}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      <div className="surface px-6 py-6" style={{ minHeight: 420 }}>
        {tab === "bracket" && (
          <div>
            {isAdmin && (
              <div className="card rounded-lg p-4 mb-6">
                <button type="button" onClick={() => setConfigOpen((v) => !v)} className="flex items-center gap-2 text-sm font-display uppercase tracking-wide cursor-pointer"><Settings size={15} className="amber" /> Configuração do campeonato {configOpen ? "▲" : "▼"}</button>
                {configOpen && (
                  <div className="mt-4">
                    <label className="text-xs faint uppercase font-display block mb-1">Nome do campeonato</label>
                    <input value={champ.name} onChange={(e) => onUpdate((c) => ({ ...c, name: e.target.value }))} className="input-dark rounded-md px-3 py-2 text-sm w-full mb-4" />
                    <label className="text-xs faint uppercase font-display block mb-1">Formato</label>
                    <select value={format} onChange={(e) => onUpdate((c) => ({ ...c, format: e.target.value }))} className="input-dark rounded-md px-3 py-2 text-sm mb-4">{FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}</select>
                    <label className="text-xs faint uppercase font-display block mb-2">Times cadastrados</label>
                    <div className="flex flex-wrap gap-2 mb-3">{teams.map((t) => (<div key={t.id} className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm card"><span className="w-2 h-2 rounded-full" style={{ background: t.color }} /> {t.name}</div>))}</div>
                    <div className="flex gap-2 max-w-sm">
                      <input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="Nome do novo time" className="input-dark rounded-md px-3 py-2 text-sm flex-1" onKeyDown={(e) => e.key === "Enter" && addTeam()} />
                      <button type="button" onClick={addTeam} className="amber-btn rounded-md px-3 flex items-center gap-1 text-sm font-display font-semibold uppercase"><Plus size={16} /> Add</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className={showBracket ? "grid grid-cols-2 gap-6" : ""}>
              <div>
                <h2 className="font-display uppercase text-sm tracking-wide muted mb-3">{format === "Soma de pontos (pontos corridos)" ? "Classificação por pontos" : "Fase de Grupos"}</h2>
                <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #2A2F3A" }}>
                  <table className="w-full text-sm">
                    <thead><tr style={{ background: "#20242D" }} className="muted text-xs uppercase font-display"><th className="text-left px-3 py-2">Time</th><th className="px-3 py-2 tabular">V</th><th className="px-3 py-2 tabular">D</th><th className="px-3 py-2 tabular">Saldo</th></tr></thead>
                    <tbody>
                      {groupStandings.map((row) => (
                        <tr key={row.team.id} className="row-btn" style={{ borderTop: "1px solid #2A2F3A" }} onClick={() => { setTab("teams"); setSelectedTeam(row.team.id); }}>
                          <td className="px-3 py-2.5 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: row.team.color }} />{row.team.name}</td>
                          <td className="text-center tabular font-semibold green">{row.w}</td><td className="text-center tabular red">{row.l}</td>
                          <td className="text-center tabular">{row.pf - row.pa > 0 ? "+" : ""}{row.pf - row.pa}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {grupoFixturesPendentes.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-xs uppercase font-display faint mb-2">Próximos jogos (sorteados)</h3>
                    <div className="space-y-1.5">
                      {grupoFixturesPendentes.map((f) => (<div key={f.id} className="text-sm card rounded-md px-3 py-2 flex items-center justify-between"><span>{findTeam(teams, f.teamA).name} vs {findTeam(teams, f.teamB).name}</span><span className="text-xs faint uppercase font-display">aguardando súmula</span></div>))}
                    </div>
                  </div>
                )}
              </div>

              {showBracket && (
                <div>
                  <h2 className="font-display uppercase text-sm tracking-wide muted mb-3">Mata-mata</h2>
                  <div className="mb-2 text-xs uppercase font-display faint">Semifinais</div>
                  <div className="space-y-3 mb-5">
                    {[0, 1].map((i) => {
                      const slot = bracketSlot("semis", i);
                      return (
                        <div key={i} className="card rounded-lg p-3">
                          {slot ? (<>
                            <MatchRow team={findTeam(teams, slot.teamA)} score={slot.played ? slot.scoreA : null} win={slot.played && slot.scoreA > slot.scoreB} onClick={() => { setTab("teams"); setSelectedTeam(slot.teamA); }} />
                            <MatchRow team={findTeam(teams, slot.teamB)} score={slot.played ? slot.scoreB : null} win={slot.played && slot.scoreB > slot.scoreA} onClick={() => { setTab("teams"); setSelectedTeam(slot.teamB); }} />
                          </>) : <div className="text-sm faint py-2 text-center">Aguardando definição</div>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mb-2 text-xs uppercase font-display faint">Final</div>
                  <div className="card rounded-lg p-3">
                    {finalGame ? (<>
                      <MatchRow team={findTeam(teams, finalGame.teamA)} score={finalGame.scoreA} win={finalGame.scoreA > finalGame.scoreB} onClick={() => { setTab("teams"); setSelectedTeam(finalGame.teamA); }} />
                      <MatchRow team={findTeam(teams, finalGame.teamB)} score={finalGame.scoreB} win={finalGame.scoreB > finalGame.scoreA} onClick={() => { setTab("teams"); setSelectedTeam(finalGame.teamB); }} />
                    </>) : <div className="text-sm faint py-2 text-center">Aguardando definição dos finalistas</div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "teams" && (
          <div>
            <div className="flex items-center gap-2 text-sm font-display uppercase tracking-wide mb-4">
              <button type="button" onClick={() => { setSelectedTeam(null); setSelectedPlayer(null); }} className={selectedTeam ? "muted cursor-pointer" : "amber"}>Times</button>
              {selectedTeam && (<><ChevronRight size={14} className="faint" /><button type="button" onClick={() => setSelectedPlayer(null)} className={selectedPlayer ? "muted cursor-pointer" : "amber"}>{findTeam(teams, selectedTeam).name}</button></>)}
              {selectedPlayer && (<><ChevronRight size={14} className="faint" /><span className="amber">{playerOf(players, selectedPlayer)?.name}</span></>)}
            </div>

            {!selectedTeam && (
              <div className="grid grid-cols-4 gap-3">
                {teams.map((t) => {
                  const s = getTeamSummary(games, teams, t.id);
                  return (
                    <button key={t.id} type="button" onClick={() => setSelectedTeam(t.id)} className="card-btn text-left rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3"><span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} /><span className="text-sm font-semibold">{t.name}</span></div>
                      <div className="font-display tabular text-lg">{s.games ? (<><span className="green">{s.wins}V</span> <span className="red">{s.losses}D</span></>) : <span className="faint text-sm">Sem jogos</span>}</div>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedTeam && !selectedPlayer && (() => {
              const t = findTeam(teams, selectedTeam); const s = getTeamSummary(games, teams, selectedTeam); const roster = players.filter((p) => p.teamId === selectedTeam);
              return (
                <div>
                  <button type="button" onClick={() => setSelectedTeam(null)} className="flex items-center gap-1 text-sm muted mb-4 cursor-pointer"><ChevronLeft size={16} /> Voltar aos times</button>
                  <h3 className="font-display text-xl uppercase font-semibold flex items-center gap-2 mb-4"><span className="w-3 h-3 rounded-full" style={{ background: t.color }} /> {t.name}</h3>
                  <div className="flex gap-8 mb-6 font-display tabular">
                    <div><div className="text-3xl green">{s.wins}</div><div className="text-xs muted uppercase">Vitórias</div></div>
                    <div><div className="text-3xl red">{s.losses}</div><div className="text-xs muted uppercase">Derrotas</div></div>
                    <div><div className="text-3xl">{s.avgPF}</div><div className="text-xs muted uppercase">Pts/jogo</div></div>
                    <div><div className="text-3xl">{s.avgPA}</div><div className="text-xs muted uppercase">Sofridos/jogo</div></div>
                  </div>
                  {s.log.length > 0 && (
                    <ResponsiveContainer width="100%" height={150}>
                      <BarChart data={s.log}><CartesianGrid stroke="#2A2F3A" vertical={false} /><XAxis dataKey="adversario" stroke="#5A606C" fontSize={11} /><YAxis stroke="#5A606C" fontSize={11} /><Tooltip contentStyle={{ background: "#20242D", border: "1px solid #2A2F3A", fontSize: 12 }} /><Bar dataKey="PTS" fill={t.color} radius={[3, 3, 0, 0]} /></BarChart>
                    </ResponsiveContainer>
                  )}
                  <h4 className="text-xs uppercase muted font-display mb-2 mt-6">Elenco ({roster.length}) — clique num jogador</h4>
                  <div className="rounded-md overflow-hidden" style={{ border: "1px solid #2A2F3A" }}>
                    <table className="w-full text-sm">
                      <thead><tr style={{ background: "#20242D" }} className="muted uppercase font-display text-xs"><th className="text-left px-3 py-2">Jogador</th><th className="px-3 py-2 tabular">Pts/jogo</th><th className="px-3 py-2 tabular">Faltas/jogo</th><th className="px-3 py-2 tabular">Jogos</th></tr></thead>
                      <tbody>
                        {roster.map((p) => { const pa = getPlayerAgg(games, players, p.id); return (
                          <tr key={p.id} onClick={() => setSelectedPlayer(p.id)} className="row-btn" style={{ borderTop: "1px solid #2A2F3A" }}>
                            <td className="px-3 py-2">{p.name}</td><td className="text-center tabular amber">{pa ? pa.avgPts : "—"}</td><td className="text-center tabular">{pa ? pa.avgFouls : "—"}</td><td className="text-center tabular">{pa ? pa.games : 0}</td>
                          </tr>); })}
                        {roster.length === 0 && (<tr><td colSpan={4} className="px-3 py-4 text-center faint text-sm">Nenhum jogador cadastrado ainda</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {selectedTeam && selectedPlayer && (() => {
              const p = playerOf(players, selectedPlayer); const agg = getPlayerAgg(games, players, selectedPlayer);
              if (!p || !agg) return null;
              return (
                <div>
                  <button type="button" onClick={() => setSelectedPlayer(null)} className="flex items-center gap-1 text-sm muted mb-4 cursor-pointer"><ChevronLeft size={16} /> Voltar ao time</button>
                  <h3 className="font-display text-xl uppercase font-semibold mb-4">{p.name}</h3>
                  <div className="flex gap-8 mb-6 font-display tabular flex-wrap">
                    <div><div className="text-3xl amber">{agg.avgPts}</div><div className="text-xs muted uppercase">Pts/jogo</div></div>
                    <div><div className="text-3xl">{agg.avgReb}</div><div className="text-xs muted uppercase">Reb/jogo</div></div>
                    <div><div className="text-3xl">{agg.avgAst}</div><div className="text-xs muted uppercase">Ast/jogo</div></div>
                    <div><div className="text-3xl">{agg.avgFouls}</div><div className="text-xs muted uppercase">Faltas/jogo</div></div>
                    <div><div className="text-3xl">{agg.games}</div><div className="text-xs muted uppercase">Jogos</div></div>
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={agg.log.map((r) => ({ ...r, adversario: findTeam(teams, r.teamId).name }))}><CartesianGrid stroke="#2A2F3A" vertical={false} /><XAxis dataKey="adversario" stroke="#5A606C" fontSize={11} /><YAxis stroke="#5A606C" fontSize={11} /><Tooltip contentStyle={{ background: "#20242D", border: "1px solid #2A2F3A", fontSize: 12 }} /><Line type="monotone" dataKey="PTS" stroke="#E8A33D" strokeWidth={2} dot={{ r: 3 }} /></LineChart>
                  </ResponsiveContainer>
                  <h4 className="text-xs uppercase muted font-display mb-2 mt-5">Registro de jogos</h4>
                  <div className="rounded-md overflow-hidden" style={{ border: "1px solid #2A2F3A" }}>
                    <table className="w-full text-xs">
                      <thead><tr style={{ background: "#20242D" }} className="muted uppercase font-display"><th className="text-left px-3 py-2">Fase</th><th className="text-left px-3 py-2">Adversário</th><th className="px-3 py-2 tabular">Pts</th><th className="px-3 py-2 tabular">Faltas</th></tr></thead>
                      <tbody>{agg.log.map((row, i) => (<tr key={i} style={{ borderTop: "1px solid #2A2F3A" }}><td className="px-3 py-2">{row.fase}</td><td className="px-3 py-2">{findTeam(teams, row.teamId).name}</td><td className="text-center tabular amber">{row.PTS}</td><td className="text-center tabular">{row.FALTAS}</td></tr>))}</tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {tab === "compare" && (() => {
          const a = findTeam(teams, compareA), b = findTeam(teams, compareB);
          const sa = getTeamSummary(games, teams, compareA), sb = getTeamSummary(games, teams, compareB);
          const same = compareA === compareB;
          const h2h = games.filter((g) => (g.teamA === compareA && g.teamB === compareB) || (g.teamA === compareB && g.teamB === compareA));
          const diff = sa.diff - sb.diff;
          const probA = Math.max(8, Math.min(92, Math.round(50 + diff * 3)));
          return (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <select value={compareA} onChange={(e) => { setCompareA(e.target.value); setShowHighlights(null); }} className="input-dark rounded-md px-3 py-2 text-sm font-display uppercase">{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                <span className="muted font-display uppercase text-sm">vs</span>
                <select value={compareB} onChange={(e) => { setCompareB(e.target.value); setShowHighlights(null); }} className="input-dark rounded-md px-3 py-2 text-sm font-display uppercase">{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
              </div>
              {same ? <p className="text-sm muted">Selecione dois times diferentes para comparar.</p> : (
                <>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    {[{ t: a, s: sa }, { t: b, s: sb }].map(({ t, s }) => (
                      <div key={t.id} className="card rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3"><span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} /><span className="font-display uppercase font-semibold">{t.name}</span></div>
                        {s.games ? (<div className="grid grid-cols-2 gap-3 font-display tabular">
                          <div><div className="text-2xl green">{s.wins}</div><div className="text-xs muted uppercase">Vitórias</div></div>
                          <div><div className="text-2xl red">{s.losses}</div><div className="text-xs muted uppercase">Derrotas</div></div>
                          <div><div className="text-2xl">{s.avgPF}</div><div className="text-xs muted uppercase">Pts/jogo</div></div>
                          <div><div className="text-2xl">{s.avgPA}</div><div className="text-xs muted uppercase">Sofridos/jogo</div></div>
                        </div>) : <p className="text-sm faint">Sem jogos registrados ainda</p>}
                      </div>
                    ))}
                  </div>
                  {sa.games > 0 && sb.games > 0 && (
                    <div className="card rounded-lg p-4 mb-6">
                      <h4 className="text-xs uppercase muted font-display mb-3">Probabilidade estimada de vitória</h4>
                      <div className="flex rounded-md overflow-hidden mb-2" style={{ height: 28 }}>
                        <div style={{ width: `${probA}%`, background: a.color }} className="flex items-center justify-center text-xs font-display font-semibold">{probA >= 15 && `${probA}%`}</div>
                        <div style={{ width: `${100 - probA}%`, background: b.color }} className="flex items-center justify-center text-xs font-display font-semibold">{100 - probA >= 15 && `${100 - probA}%`}</div>
                      </div>
                      <div className="flex justify-between text-xs muted font-display uppercase"><span>{a.name} — {probA}%</span><span>{b.name} — {100 - probA}%</span></div>
                      <p className="text-xs faint mt-3">Estimativa simples baseada no saldo médio de pontos de cada time. Não é um modelo preditivo real.</p>
                    </div>
                  )}
                  <h4 className="text-xs uppercase muted font-display mb-2">Confrontos diretos</h4>
                  {h2h.length === 0 ? <p className="text-sm faint mb-6">Esses times ainda não se enfrentaram.</p> : (
                    <div className="space-y-2 mb-6">{h2h.map((g) => (<div key={g.id} className="flex items-center justify-between rounded-md px-3 py-2 text-sm card"><span>{findTeam(teams, g.teamA).name} {g.scoreA} x {g.scoreB} {findTeam(teams, g.teamB).name}</span><span className="faint text-xs uppercase font-display">{PHASE_LABEL[g.phase] || g.phase}</span></div>))}</div>
                  )}
                  <div className="flex gap-3 mb-4">
                    <button type="button" onClick={() => setShowHighlights(showHighlights === "A" ? null : "A")} className="ghost-btn flex items-center gap-2 text-sm font-display uppercase px-3 py-2 rounded-md"><Sparkles size={14} /> Destaques {a.name}</button>
                    <button type="button" onClick={() => setShowHighlights(showHighlights === "B" ? null : "B")} className="ghost-btn flex items-center gap-2 text-sm font-display uppercase px-3 py-2 rounded-md"><Sparkles size={14} /> Destaques {b.name}</button>
                  </div>
                  {showHighlights && (() => {
                    const team = showHighlights === "A" ? a : b; const insight = teamInsight(games, players, team.id);
                    return (
                      <div className="card rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3"><span className="w-2.5 h-2.5 rounded-full" style={{ background: team.color }} /><span className="font-display uppercase font-semibold">Destaques — {team.name}</span></div>
                        {insight.roster.length > 0 && (<div className="space-y-2 mb-3">{insight.roster.map(({ player, agg }, i) => (<div key={player.id} className="flex items-center justify-between text-sm"><span><span className="faint font-display tabular mr-2">{i + 1}</span>{player.name}</span><span className="font-display tabular amber">{agg.avgPts} pts/jogo</span></div>))}</div>)}
                        <p className="text-sm muted">{insight.text}</p>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          );
        })()}

        {tab === "resumo" && (
          <div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="card rounded-lg p-4"><div className="text-xs uppercase muted font-display mb-2">Líder de pontos</div>{topScorers[0] ? (<div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: findTeam(teams, topScorers[0].player.teamId).color }} /><span className="font-semibold">{topScorers[0].player.name}</span><span className="font-display tabular amber ml-auto">{topScorers[0].agg.avgPts}</span></div>) : <span className="faint text-sm">Sem dados</span>}</div>
              <div className="card rounded-lg p-4"><div className="text-xs uppercase muted font-display mb-2">Melhor ataque</div>{bestAttack ? (<div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: bestAttack.team.color }} /><span className="font-semibold">{bestAttack.team.name}</span><span className="font-display tabular green ml-auto">{bestAttack.s.avgPF} pts/jogo</span></div>) : <span className="faint text-sm">Sem dados</span>}</div>
              <div className="card rounded-lg p-4"><div className="text-xs uppercase muted font-display mb-2">Melhor defesa</div>{bestDefense ? (<div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: bestDefense.team.color }} /><span className="font-semibold">{bestDefense.team.name}</span><span className="font-display tabular green ml-auto">{bestDefense.s.avgPA} sofridos/jogo</span></div>) : <span className="faint text-sm">Sem dados</span>}</div>
            </div>
            <h2 className="font-display uppercase text-sm tracking-wide muted mb-3">Artilheiros do campeonato</h2>
            <div className="space-y-2">
              {topScorers.map(({ player, agg }, i) => (
                <button key={player.id} type="button" onClick={() => { setTab("teams"); setSelectedTeam(player.teamId); setSelectedPlayer(player.id); }} className="card-btn w-full flex items-center justify-between rounded-md px-3 py-2.5">
                  <div className="flex items-center gap-3"><span className="font-display tabular muted w-4">{i + 1}</span><span className="w-2 h-2 rounded-full" style={{ background: findTeam(teams, player.teamId).color }} /><span className="text-sm">{player.name}</span></div>
                  <span className="font-display tabular text-lg amber">{agg.avgPts}</span>
                </button>
              ))}
              {topScorers.length === 0 && <p className="text-sm faint">Ainda não há jogos registrados.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MatchRow({ team, score, win, onClick }) {
  return (
    <div onClick={onClick} className="row-btn flex items-center justify-between px-2 py-1.5 rounded-md">
      <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: team.color }} /><span className={`text-sm ${win ? "font-semibold" : "faint"}`}>{team.name}</span></div>
      {score !== null && score !== undefined ? <span className={`font-display tabular text-lg ${win ? "amber" : "faint"}`}>{score}</span> : <span className="text-xs faint uppercase font-display">a definir</span>}
    </div>
  );
}
