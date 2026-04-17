import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Pencil, ToggleLeft, ToggleRight, Search, BookOpen, Layers, Tag, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import clsx from 'clsx';
import type { Question, QuestionCategory, Subject } from '@/types';

type AdminQuestion = Question & { question_categories?: { name: string } };
type ActiveTab = 'questions' | 'categories' | 'subjects';

const DIFFICULTY_LABELS: Record<string, string> = { easy: 'Leicht', medium: 'Mittel', hard: 'Schwer' };
const DIFFICULTY_VARIANTS: Record<string, 'success' | 'warning' | 'danger'> = {
  easy: 'success', medium: 'warning', hard: 'danger',
};

const emptyQuestion: {
  question: string; answers: string[]; correct_index: number;
  category_id: string; difficulty: Question['difficulty']; tags: string[];
} = {
  question: '', answers: ['', '', '', ''], correct_index: 0,
  category_id: '', difficulty: 'easy', tags: [],
};

const emptyCategoryForm = { key: '', name: '', icon: '', color: '#2E5BFF', sort_order: 0 };
const emptySubjectForm = { key: '', name: '', category_id: '', icon: '', color: '#2E5BFF', sort_order: 0 };

export function AdminQuestionsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>('questions');

  // Data
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [categories, setCategories] = useState<QuestionCategory[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active');

  // Question modal
  const [qModal, setQModal] = useState(false);
  const [qEditing, setQEditing] = useState<AdminQuestion | null>(null);
  const [qForm, setQForm] = useState(emptyQuestion);
  const [qLoading, setQLoading] = useState(false);
  const [qError, setQError] = useState('');

  // Category modal
  const [catModal, setCatModal] = useState(false);
  const [catEditing, setCatEditing] = useState<QuestionCategory | null>(null);
  const [catForm, setCatForm] = useState(emptyCategoryForm);
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState('');

  // Subject modal
  const [subModal, setSubModal] = useState(false);
  const [subEditing, setSubEditing] = useState<Subject | null>(null);
  const [subForm, setSubForm] = useState(emptySubjectForm);
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState('');

  useEffect(() => {
    if (!user?.is_admin) { navigate('/'); return; }
    fetchAll();
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    const [qRes, catRes, subRes] = await Promise.all([
      supabase.from('questions').select('*, question_categories(name)').order('sort_order', { ascending: true }),
      supabase.from('question_categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('subjects').select('*').order('sort_order', { ascending: true }),
    ]);
    setQuestions(qRes.data || []);
    setCategories(catRes.data || []);
    setSubjects(subRes.data || []);
    setLoading(false);
  };

  // ── Question helpers ──────────────────────────────────────────────────────

  const openNewQuestion = () => {
    setQEditing(null);
    setQForm({ ...emptyQuestion, category_id: categories[0]?.id || '' });
    setQError('');
    setQModal(true);
  };

  const openEditQuestion = (q: AdminQuestion) => {
    setQEditing(q);
    setQForm({
      question: q.question,
      answers: [...q.answers],
      correct_index: q.correct_index,
      category_id: q.category_id || '',
      difficulty: q.difficulty,
      tags: [...q.tags],
    });
    setQError('');
    setQModal(true);
  };

  const saveQuestion = async () => {
    if (!qForm.question.trim()) { setQError('Bitte eine Frage eingeben.'); return; }
    if (qForm.answers.some(a => !a.trim())) { setQError('Alle 4 Antworten müssen ausgefüllt sein.'); return; }
    if (!qForm.category_id) { setQError('Bitte eine Kategorie wählen.'); return; }

    setQLoading(true);
    setQError('');
    try {
      if (qEditing) {
        const { error } = await supabase.from('questions').update({
          question: qForm.question.trim(),
          answers: qForm.answers.map(a => a.trim()),
          correct_index: qForm.correct_index,
          category_id: qForm.category_id,
          difficulty: qForm.difficulty,
          tags: qForm.tags,
          updated_at: new Date().toISOString(),
        }).eq('id', qEditing.id);
        if (error) throw error;
      } else {
        const { data: maxData } = await supabase.from('questions').select('sort_order').order('sort_order', { ascending: false }).limit(1).single();
        const nextOrder = (maxData?.sort_order ?? 0) + 1;
        const { error } = await supabase.from('questions').insert({
          question: qForm.question.trim(),
          answers: qForm.answers.map(a => a.trim()),
          correct_index: qForm.correct_index,
          category_id: qForm.category_id,
          difficulty: qForm.difficulty,
          tags: qForm.tags,
          sort_order: nextOrder,
          is_active: true,
        });
        if (error) throw error;
      }
      setQModal(false);
      fetchAll();
    } catch (e: unknown) {
      setQError(e instanceof Error ? e.message : 'Fehler beim Speichern.');
    } finally {
      setQLoading(false);
    }
  };

  const toggleActive = async (q: AdminQuestion) => {
    await supabase.from('questions').update({ is_active: !q.is_active, updated_at: new Date().toISOString() }).eq('id', q.id);
    fetchAll();
  };

  // ── Category helpers ──────────────────────────────────────────────────────

  const openNewCategory = () => {
    setCatEditing(null);
    setCatForm(emptyCategoryForm);
    setCatError('');
    setCatModal(true);
  };

  const openEditCategory = (cat: QuestionCategory) => {
    setCatEditing(cat);
    setCatForm({ key: cat.key, name: cat.name, icon: cat.icon, color: cat.color, sort_order: cat.sort_order });
    setCatError('');
    setCatModal(true);
  };

  const saveCategory = async () => {
    if (!catForm.key.trim() || !catForm.name.trim()) { setCatError('Key und Name sind Pflichtfelder.'); return; }
    setCatLoading(true);
    setCatError('');
    try {
      if (catEditing) {
        const { error } = await supabase.from('question_categories').update({
          name: catForm.name.trim(), icon: catForm.icon.trim(),
          color: catForm.color, sort_order: catForm.sort_order,
        }).eq('id', catEditing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('question_categories').insert({
          key: catForm.key.trim().toLowerCase(), name: catForm.name.trim(),
          icon: catForm.icon.trim(), color: catForm.color, sort_order: catForm.sort_order,
        });
        if (error) throw error;
      }
      setCatModal(false);
      fetchAll();
    } catch (e: unknown) {
      setCatError(e instanceof Error ? e.message : 'Fehler beim Speichern.');
    } finally {
      setCatLoading(false);
    }
  };

  // ── Subject helpers ───────────────────────────────────────────────────────

  const openNewSubject = () => {
    setSubEditing(null);
    setSubForm({ ...emptySubjectForm, category_id: categories[0]?.id || '' });
    setSubError('');
    setSubModal(true);
  };

  const openEditSubject = (sub: Subject) => {
    setSubEditing(sub);
    setSubForm({ key: sub.key, name: sub.name, category_id: sub.category_id, icon: sub.icon, color: sub.color, sort_order: sub.sort_order });
    setSubError('');
    setSubModal(true);
  };

  const saveSubject = async () => {
    if (!subForm.key.trim() || !subForm.name.trim()) { setSubError('Key und Name sind Pflichtfelder.'); return; }
    if (!subForm.category_id) { setSubError('Bitte eine Kategorie wählen.'); return; }
    setSubLoading(true);
    setSubError('');
    try {
      if (subEditing) {
        const { error } = await supabase.from('subjects').update({
          name: subForm.name.trim(), category_id: subForm.category_id,
          icon: subForm.icon.trim(), color: subForm.color, sort_order: subForm.sort_order,
        }).eq('id', subEditing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('subjects').insert({
          key: subForm.key.trim().toLowerCase(), name: subForm.name.trim(),
          category_id: subForm.category_id, icon: subForm.icon.trim(),
          color: subForm.color, sort_order: subForm.sort_order,
        });
        if (error) throw error;
      }
      setSubModal(false);
      fetchAll();
    } catch (e: unknown) {
      setSubError(e instanceof Error ? e.message : 'Fehler beim Speichern.');
    } finally {
      setSubLoading(false);
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const filteredQuestions = questions.filter(q => {
    if (filterActive === 'active' && !q.is_active) return false;
    if (filterActive === 'inactive' && q.is_active !== false) return false;
    if (filterCategory && q.category_id !== filterCategory) return false;
    if (filterDifficulty && q.difficulty !== filterDifficulty) return false;
    if (search && !q.question.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const subjectsForCategory = (categoryId: string) =>
    subjects.filter(s => s.category_id === categoryId);

  const categoryName = (id: string) =>
    categories.find(c => c.id === id)?.name || '—';

  const tabs = [
    { id: 'questions' as const, label: 'Fragen', icon: BookOpen, count: questions.length },
    { id: 'categories' as const, label: 'Kategorien', icon: Layers, count: categories.length },
    { id: 'subjects' as const, label: 'Themen', icon: Tag, count: subjects.length },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link to="/admin">
          <button className="p-2 rounded-lg text-nexus-muted hover:text-white hover:bg-nexus-surface transition-all cursor-pointer">
            <ArrowLeft size={20} />
          </button>
        </Link>
        <BookOpen size={28} className="text-nexus-accent" />
        <div>
          <h1 className="text-3xl font-black text-white">Fragen-Verwaltung</h1>
          <p className="text-nexus-muted text-sm">{questions.length} Fragen · {categories.length} Kategorien · {subjects.length} Themen</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400 mb-6 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="ml-3 hover:text-white cursor-pointer"><X size={14} /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-nexus-bg/60 border border-nexus-border rounded-xl mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 cursor-pointer',
              activeTab === tab.id
                ? 'bg-nexus-surface text-white shadow-sm'
                : 'text-nexus-muted hover:text-white hover:bg-nexus-surface/50'
            )}
          >
            <tab.icon size={15} />
            {tab.label}
            <span className={clsx('text-xs px-1.5 py-0.5 rounded-full font-mono',
              activeTab === tab.id ? 'bg-nexus-accent/20 text-nexus-accent' : 'bg-nexus-surface text-nexus-muted'
            )}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* ── Tab: Fragen ───────────────────────────────────────────────────── */}
      {activeTab === 'questions' && (
        <div className="flex flex-col gap-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-nexus-muted pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Frage suchen…"
                className="w-full bg-nexus-bg border border-nexus-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-nexus-muted focus:outline-none focus:border-nexus-primary transition-colors"
              />
            </div>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="bg-nexus-bg border border-nexus-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-nexus-primary cursor-pointer"
            >
              <option value="">Alle Kategorien</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <select
              value={filterDifficulty}
              onChange={e => setFilterDifficulty(e.target.value)}
              className="bg-nexus-bg border border-nexus-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-nexus-primary cursor-pointer"
            >
              <option value="">Alle Schwierigkeiten</option>
              <option value="easy">Leicht</option>
              <option value="medium">Mittel</option>
              <option value="hard">Schwer</option>
            </select>
            <select
              value={filterActive}
              onChange={e => setFilterActive(e.target.value as typeof filterActive)}
              className="bg-nexus-bg border border-nexus-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-nexus-primary cursor-pointer"
            >
              <option value="active">Nur aktive</option>
              <option value="inactive">Nur inaktive</option>
              <option value="all">Alle</option>
            </select>
            <Button variant="primary" onClick={openNewQuestion}>
              <Plus size={16} />
              Neue Frage
            </Button>
          </div>

          {/* Table */}
          <div className="bg-nexus-surface/70 backdrop-blur-sm border border-nexus-border rounded-xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-nexus-muted text-sm">Lädt…</div>
            ) : filteredQuestions.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-nexus-muted text-sm">Keine Fragen gefunden.</div>
            ) : (
              <div className="divide-y divide-nexus-border/50">
                {filteredQuestions.map(q => (
                  <div key={q.id} className="flex items-start gap-4 px-5 py-4 hover:bg-nexus-surface/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className={clsx('text-sm font-medium leading-snug line-clamp-2', q.is_active === false ? 'text-nexus-muted line-through' : 'text-white')}>
                        {q.question}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="text-xs text-nexus-muted">{(q.question_categories as { name: string } | undefined)?.name || categoryName(q.category_id || '')}</span>
                        <Badge variant={DIFFICULTY_VARIANTS[q.difficulty]}>{DIFFICULTY_LABELS[q.difficulty]}</Badge>
                        {q.tags.map(tag => (
                          <span key={tag} className="text-xs bg-nexus-bg border border-nexus-border/50 text-nexus-muted px-1.5 py-0.5 rounded">{tag}</span>
                        ))}
                        {q.is_active === false && <Badge variant="danger">Inaktiv</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                      <button
                        onClick={() => openEditQuestion(q)}
                        className="p-1.5 rounded-lg text-nexus-muted hover:text-nexus-accent hover:bg-nexus-bg/60 transition-all cursor-pointer"
                        title="Bearbeiten"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => toggleActive(q)}
                        className={clsx('p-1.5 rounded-lg transition-all cursor-pointer', q.is_active === false
                          ? 'text-nexus-muted hover:text-emerald-400 hover:bg-nexus-bg/60'
                          : 'text-emerald-400 hover:text-red-400 hover:bg-nexus-bg/60'
                        )}
                        title={q.is_active === false ? 'Aktivieren' : 'Deaktivieren'}
                      >
                        {q.is_active === false ? <ToggleLeft size={18} /> : <ToggleRight size={18} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-nexus-muted text-right">{filteredQuestions.length} von {questions.length} Fragen</p>
        </div>
      )}

      {/* ── Tab: Kategorien ───────────────────────────────────────────────── */}
      {activeTab === 'categories' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Button variant="primary" onClick={openNewCategory}>
              <Plus size={16} />
              Neue Kategorie
            </Button>
          </div>
          <div className="bg-nexus-surface/70 backdrop-blur-sm border border-nexus-border rounded-xl overflow-hidden">
            {categories.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-nexus-muted text-sm">Keine Kategorien vorhanden.</div>
            ) : (
              <div className="divide-y divide-nexus-border/50">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-nexus-surface/30 transition-colors">
                    <span className="text-2xl w-8 text-center">{cat.icon}</span>
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 border border-nexus-border"
                      style={{ backgroundColor: cat.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{cat.name}</p>
                      <p className="text-xs text-nexus-muted font-mono">{cat.key}</p>
                    </div>
                    <span className="text-xs text-nexus-muted">sort: {cat.sort_order}</span>
                    <button
                      onClick={() => openEditCategory(cat)}
                      className="p-1.5 rounded-lg text-nexus-muted hover:text-nexus-accent hover:bg-nexus-bg/60 transition-all cursor-pointer"
                    >
                      <Pencil size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Themen ───────────────────────────────────────────────────── */}
      {activeTab === 'subjects' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-nexus-muted">Der Key eines Themas wird als Tag in Fragen gespeichert und steuert die Filterung im Spiel.</p>
            <Button variant="primary" onClick={openNewSubject}>
              <Plus size={16} />
              Neues Thema
            </Button>
          </div>
          <div className="bg-nexus-surface/70 backdrop-blur-sm border border-nexus-border rounded-xl overflow-hidden">
            {subjects.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-nexus-muted text-sm">Keine Themen vorhanden.</div>
            ) : (
              <div className="divide-y divide-nexus-border/50">
                {subjects.map(sub => (
                  <div key={sub.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-nexus-surface/30 transition-colors">
                    <span className="text-2xl w-8 text-center">{sub.icon}</span>
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 border border-nexus-border"
                      style={{ backgroundColor: sub.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{sub.name}</p>
                      <p className="text-xs text-nexus-muted font-mono">{sub.key}</p>
                    </div>
                    <span className="text-xs text-nexus-muted">{categoryName(sub.category_id)}</span>
                    <span className="text-xs text-nexus-muted">sort: {sub.sort_order}</span>
                    <button
                      onClick={() => openEditSubject(sub)}
                      className="p-1.5 rounded-lg text-nexus-muted hover:text-nexus-accent hover:bg-nexus-bg/60 transition-all cursor-pointer"
                    >
                      <Pencil size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Frage ─────────────────────────────────────────────────── */}
      <Modal isOpen={qModal} onClose={() => setQModal(false)} title={qEditing ? 'Frage bearbeiten' : 'Neue Frage'} size="lg">
        <div className="flex flex-col gap-4">
          {/* Frage */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-nexus-muted">Frage</label>
            <textarea
              value={qForm.question}
              onChange={e => setQForm(f => ({ ...f, question: e.target.value }))}
              rows={3}
              className="bg-nexus-bg border border-nexus-border rounded-lg px-4 py-3 text-white placeholder-nexus-muted focus:outline-none focus:border-nexus-primary transition-colors resize-none text-sm"
              placeholder="Fragetext eingeben…"
            />
          </div>

          {/* Antworten + Richtige */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-nexus-muted">Antworten <span className="text-xs">(● = richtige Antwort)</span></label>
            {qForm.answers.map((ans, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct"
                  checked={qForm.correct_index === i}
                  onChange={() => setQForm(f => ({ ...f, correct_index: i }))}
                  className="accent-nexus-accent cursor-pointer w-4 h-4 flex-shrink-0"
                />
                <input
                  type="text"
                  value={ans}
                  onChange={e => {
                    const newAnswers = [...qForm.answers];
                    newAnswers[i] = e.target.value;
                    setQForm(f => ({ ...f, answers: newAnswers }));
                  }}
                  placeholder={`Antwort ${i + 1}`}
                  className={clsx(
                    'flex-1 bg-nexus-bg border rounded-lg px-3 py-2 text-sm text-white placeholder-nexus-muted focus:outline-none transition-colors',
                    qForm.correct_index === i ? 'border-emerald-500/50 focus:border-emerald-500' : 'border-nexus-border focus:border-nexus-primary'
                  )}
                />
              </div>
            ))}
          </div>

          {/* Kategorie + Schwierigkeit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-nexus-muted">Kategorie</label>
              <select
                value={qForm.category_id}
                onChange={e => setQForm(f => ({ ...f, category_id: e.target.value, tags: [] }))}
                className="bg-nexus-bg border border-nexus-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-nexus-primary transition-colors cursor-pointer"
              >
                <option value="">Bitte wählen</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-nexus-muted">Schwierigkeit</label>
              <select
                value={qForm.difficulty}
                onChange={e => setQForm(f => ({ ...f, difficulty: e.target.value as Question['difficulty'] }))}
                className="bg-nexus-bg border border-nexus-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-nexus-primary transition-colors cursor-pointer"
              >
                <option value="easy">Leicht</option>
                <option value="medium">Mittel</option>
                <option value="hard">Schwer</option>
              </select>
            </div>
          </div>

          {/* Themen/Tags */}
          {qForm.category_id && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-nexus-muted">Themen (Tags)</label>
              <div className="flex flex-wrap gap-2 p-3 bg-nexus-bg border border-nexus-border rounded-lg min-h-[48px]">
                {subjectsForCategory(qForm.category_id).map(sub => {
                  const active = qForm.tags.includes(sub.key);
                  return (
                    <button
                      key={sub.key}
                      type="button"
                      onClick={() => setQForm(f => ({
                        ...f,
                        tags: active ? f.tags.filter(t => t !== sub.key) : [...f.tags, sub.key],
                      }))}
                      className={clsx(
                        'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border',
                        active
                          ? 'bg-nexus-accent/20 border-nexus-accent text-nexus-accent'
                          : 'bg-nexus-surface border-nexus-border text-nexus-muted hover:text-white hover:border-nexus-muted'
                      )}
                    >
                      {sub.icon} {sub.name}
                    </button>
                  );
                })}
                {subjectsForCategory(qForm.category_id).length === 0 && (
                  <span className="text-xs text-nexus-muted">Keine Themen für diese Kategorie.</span>
                )}
              </div>
            </div>
          )}

          {qError && <p className="text-sm text-red-400">{qError}</p>}
          <Button variant="primary" onClick={saveQuestion} loading={qLoading} fullWidth>
            Speichern
          </Button>
        </div>
      </Modal>

      {/* ── Modal: Kategorie ─────────────────────────────────────────────── */}
      <Modal isOpen={catModal} onClose={() => setCatModal(false)} title={catEditing ? 'Kategorie bearbeiten' : 'Neue Kategorie'} size="md">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-nexus-muted">Key <span className="text-xs">(lowercase, unveränderlich nach Anlage)</span></label>
            <Input
              value={catForm.key}
              onChange={e => setCatForm(f => ({ ...f, key: e.target.value.toLowerCase() }))}
              placeholder="z.B. exam_prep"
              disabled={!!catEditing}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-nexus-muted">Name</label>
            <Input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Prüfungsvorbereitung" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-nexus-muted">Icon (Emoji)</label>
              <Input value={catForm.icon} onChange={e => setCatForm(f => ({ ...f, icon: e.target.value }))} placeholder="📚" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-nexus-muted">Farbe</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={catForm.color} onChange={e => setCatForm(f => ({ ...f, color: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-nexus-border bg-nexus-bg cursor-pointer" />
                <span className="text-sm font-mono text-nexus-muted">{catForm.color}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-nexus-muted">Sortierung</label>
            <Input type="number" value={catForm.sort_order} onChange={e => setCatForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
          </div>
          {catError && <p className="text-sm text-red-400">{catError}</p>}
          <Button variant="primary" onClick={saveCategory} loading={catLoading} fullWidth>Speichern</Button>
        </div>
      </Modal>

      {/* ── Modal: Thema ─────────────────────────────────────────────────── */}
      <Modal isOpen={subModal} onClose={() => setSubModal(false)} title={subEditing ? 'Thema bearbeiten' : 'Neues Thema'} size="md">
        <div className="flex flex-col gap-4">
          <div className="bg-nexus-bg/60 border border-nexus-border/50 rounded-lg px-3 py-2 text-xs text-nexus-muted">
            💡 Der Key wird als Tag in Fragen gespeichert und steuert die Filterung im Spiel.
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-nexus-muted">Key <span className="text-xs">(lowercase, unveränderlich nach Anlage)</span></label>
            <Input
              value={subForm.key}
              onChange={e => setSubForm(f => ({ ...f, key: e.target.value.toLowerCase() }))}
              placeholder="z.B. projektmanagement"
              disabled={!!subEditing}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-nexus-muted">Name</label>
            <Input value={subForm.name} onChange={e => setSubForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Projektmanagement" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-nexus-muted">Kategorie</label>
            <select
              value={subForm.category_id}
              onChange={e => setSubForm(f => ({ ...f, category_id: e.target.value }))}
              className="bg-nexus-bg border border-nexus-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-nexus-primary transition-colors cursor-pointer"
            >
              <option value="">Bitte wählen</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-nexus-muted">Icon (Emoji)</label>
              <Input value={subForm.icon} onChange={e => setSubForm(f => ({ ...f, icon: e.target.value }))} placeholder="📋" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-nexus-muted">Farbe</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={subForm.color} onChange={e => setSubForm(f => ({ ...f, color: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-nexus-border bg-nexus-bg cursor-pointer" />
                <span className="text-sm font-mono text-nexus-muted">{subForm.color}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-nexus-muted">Sortierung</label>
            <Input type="number" value={subForm.sort_order} onChange={e => setSubForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
          </div>
          {subError && <p className="text-sm text-red-400">{subError}</p>}
          <Button variant="primary" onClick={saveSubject} loading={subLoading} fullWidth>Speichern</Button>
        </div>
      </Modal>
    </div>
  );
}
