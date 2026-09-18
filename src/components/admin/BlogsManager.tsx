"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import type { PublicBlogPost } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Clock,
  Eye,
  Newspaper,
  Pencil,
  Plus,
  Save,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { useAdminBlogs, useAdminBlog, useAdminCategories, useAdminProducts, useBlogCategoriesList, useAdminFaqs } from "./useAdminData";
import { PUBLIC_CACHE_KEYS } from "./useAdminData";
import { BlogStatusBadge, CharCount, ConfirmDialog, EmptyState, Field, GooglePreview, ImageThumb, PaginationBar, SlugInput, Spinner } from "./shared";
import { RichTextEditor, type InternalLinkOption } from "./rich-text-editor";
import { MediaPickField } from "./media-picker";
import { errMsg, fmtDate, timeAgo, toDatetimeLocal, useDebounced } from "./admin-utils";

// ============================================================
// Blog posts module — list + dedicated editor form.
// ============================================================

type FaqRow = { id?: string; question: string; answer: string };

export function BlogsManager({
  jump,
  createSignal,
  editId,
}: {
  jump?: { q: string; n: number };
  createSignal?: number;
  editId?: string;
}) {
  const [view, setView] = useState<"list" | "form">(createSignal ? "form" : "list");
  const [editingId, setEditingId] = useState<string | null>(createSignal ? null : (editId ?? null));

  const [q, setQ] = useState(jump?.q ?? "");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const debouncedQ = useDebounced(q);
  const qc = useQueryClient();
  const { toast } = useToast();

  const params = { page, pageSize, q: debouncedQ, status };
  const { data, isLoading } = useAdminBlogs(params);
  const blogsKey = ["admin", "blogs", page, pageSize, debouncedQ, status] as const;

  function toggleFeatured(post: PublicBlogPost) {
    const prevData = qc.getQueryData<{ items: PublicBlogPost[] }>(blogsKey);
    if (prevData) {
      qc.setQueryData(blogsKey, {
        ...prevData,
        items: prevData.items.map((p) => (p.id === post.id ? { ...p, featured: !p.featured } : p)),
      });
    }
    api
      .put(`/api/admin/blogs/${post.id}`, { featured: !post.featured })
      .then(() => {
        toast({ title: !post.featured ? "Marked as featured" : "Removed from featured", description: post.title });
        for (const key of PUBLIC_CACHE_KEYS) void qc.invalidateQueries({ queryKey: key });
      })
      .catch((e) => {
        if (prevData) qc.setQueryData(blogsKey, prevData);
        toast({ title: "Update failed", description: errMsg(e), variant: "destructive" });
      });
  }

  const [toDelete, setToDelete] = useState<PublicBlogPost | null>(null);
  const [deleting, setDeleting] = useState(false);

  function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    api
      .delete(`/api/admin/blogs/${toDelete.id}`)
      .then(() => {
        toast({ title: "Blog post deleted", description: toDelete.title });
        setToDelete(null);
        void qc.invalidateQueries({ queryKey: ["admin", "blogs"] });
        void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
        for (const key of PUBLIC_CACHE_KEYS) void qc.invalidateQueries({ queryKey: key });
      })
      .catch((e) => toast({ title: "Delete failed", description: errMsg(e), variant: "destructive" }))
      .finally(() => setDeleting(false));
  }

  if (view === "form") {
    return (
      <BlogForm
        id={editingId}
        onBack={() => {
          setView("list");
          setEditingId(null);
          void qc.invalidateQueries({ queryKey: ["admin", "blogs"] });
        }}
      />
    );
  }

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by title or tag…" className="pl-8" aria-label="Search blog posts" />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => { setEditingId(null); setView("form"); }}>
          <Plus className="mr-1 h-4 w-4" /> New Blog Post
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Newspaper className="h-8 w-8 text-muted-foreground/50" />}
          title="No blog posts found"
          hint="Share resin-art stories, care guides and gifting ideas to bring visitors from Google."
          action={
            <Button className="mt-2" onClick={() => { setEditingId(null); setView("form"); }}>
              <Plus className="mr-1 h-4 w-4" /> New Blog Post
            </Button>
          }
        />
      ) : (
        <>
          <div className="hidden max-h-[70vh] overflow-auto custom-scroll rounded-lg border md:block">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="w-16">Cover</TableHead>
                  <TableHead>Post</TableHead>
                  <TableHead className="w-32">Category</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-20">Featured</TableHead>
                  <TableHead className="w-36">Published / Updated</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <ImageThumb src={p.coverImage} alt={p.coverAlt} size={44} />
                    </TableCell>
                    <TableCell>
                      <button type="button" className="text-left" onClick={() => { setEditingId(p.id); setView("form"); }}>
                        <p className="font-medium hover:text-primary">{p.title}</p>
                        <p className="text-xs text-muted-foreground">/{p.slug} · {p.readingTime} min read</p>
                      </button>
                    </TableCell>
                    <TableCell>
                      {p.blogCategoryName ? <Badge variant="secondary" className="max-w-28 truncate">{p.blogCategoryName}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell><BlogStatusBadge status={p.status} /></TableCell>
                    <TableCell>
                      <button type="button" onClick={() => toggleFeatured(p)} className="rounded p-1 hover:bg-secondary" aria-label="Toggle featured" aria-pressed={p.featured}>
                        <Star className={`h-4 w-4 ${p.featured ? "text-gold" : "text-muted-foreground/40"}`} fill={p.featured ? "currentColor" : "none"} />
                      </button>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.status === "SCHEDULED" ? (
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {fmtDate(p.publishedAt)}</span>
                      ) : p.publishedAt ? (
                        fmtDate(p.publishedAt)
                      ) : (
                        timeAgo(p.updatedAt)
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => { setEditingId(p.id); setView("form"); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-secondary" title="Preview" aria-label={`Preview ${p.title}`}>
                          <Eye className="h-4 w-4" />
                        </a>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete" onClick={() => setToDelete(p)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2 md:hidden">
            {items.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex gap-3 p-3">
                  <ImageThumb src={p.coverImage} alt={p.coverAlt} size={56} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <button type="button" className="text-left min-w-0" onClick={() => { setEditingId(p.id); setView("form"); }}>
                        <p className="truncate font-medium">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{p.readingTime} min read</p>
                      </button>
                      <BlogStatusBadge status={p.status} />
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {p.blogCategoryName ? <Badge variant="secondary" className="max-w-28 truncate">{p.blogCategoryName}</Badge> : null}
                      <button type="button" onClick={() => toggleFeatured(p)} aria-label="Toggle featured">
                        <Star className={`h-4 w-4 ${p.featured ? "text-gold" : "text-muted-foreground/40"}`} fill={p.featured ? "currentColor" : "none"} />
                      </button>
                      {p.publishedAt ? fmtDate(p.publishedAt) : timeAgo(p.updatedAt)}
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-0.5">
                      <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-secondary" aria-label="Preview">
                        <Eye className="h-4 w-4" />
                      </a>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setToDelete(p)} aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <PaginationBar page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} total={data?.total ?? 0} onPage={setPage} />
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete “${toDelete?.title ?? ""}”?`}
        description="This permanently removes the blog post from the website. This cannot be undone."
        confirmLabel="Delete post"
        onConfirm={confirmDelete}
        pending={deleting}
      />
    </div>
  );
}

// ============================================================
// Blog form
// ============================================================

interface BlogFormState {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  coverAlt: string;
  author: string;
  readingTime: number;
  tags: string;
  featured: boolean;
  status: string;
  publishAt: string; // datetime-local
  blogCategoryId: string;
  relatedProductSlugs: string[];
  faqs: FaqRow[];
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  secondaryKeywords: string;
  ogTitle: string;
  ogDescription: string;
  canonicalUrl: string;
}

const EMPTY_BLOG: BlogFormState = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImage: "",
  coverAlt: "",
  author: "Khushi",
  readingTime: 0,
  tags: "",
  featured: false,
  status: "DRAFT",
  publishAt: "",
  blogCategoryId: "",
  relatedProductSlugs: [],
  faqs: [],
  seoTitle: "",
  metaDescription: "",
  focusKeyword: "",
  secondaryKeywords: "",
  ogTitle: "",
  ogDescription: "",
  canonicalUrl: "",
};

function BlogForm({ id, onBack }: { id: string | null; onBack: () => void }) {
  const [currentId, setCurrentId] = useState<string | null>(id);
  const isNew = !currentId;
  const { data: post, isLoading } = useAdminBlog(currentId);
  const { data: blogCategories } = useBlogCategoriesList();
  const { data: products } = useAdminProducts({ page: 1, pageSize: 200, q: "", category: "", status: "published" });
  const { data: categories } = useAdminCategories();
  const { data: allBlogs } = useAdminBlogs({ page: 1, pageSize: 200, q: "", status: "all" });
  const { data: allFaqs } = useAdminFaqs("");

  const [form, setForm] = useState<BlogFormState>(EMPTY_BLOG);
  const [initialFaqIds, setInitialFaqIds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("content");
  const [relatedQ, setRelatedQ] = useState("");
  const initRef = useRef<string | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const blogFaqs = useMemo(
    () => (allFaqs ?? []).filter((f) => f.entityType === "BLOG" && f.entityId === currentId),
    [allFaqs, currentId],
  );

  // load existing post into form once (waits for the FAQ list to avoid a race)
  useEffect(() => {
    if (!post || !allFaqs || initRef.current === post.id) return;
    initRef.current = post.id;
    const faqs = allFaqs
      .filter((f) => f.entityType === "BLOG" && f.entityId === post.id)
      .map((f) => ({ id: f.id, question: f.question, answer: f.answer }));
    setInitialFaqIds(allFaqs.filter((f) => f.entityType === "BLOG" && f.entityId === post.id).map((f) => f.id));
    // prefer the post's own scheduled publishAt; fall back to publishedAt,
    // then a sensible default (+24h) for SCHEDULED posts with no date known
    let publishAtValue = post.status === "SCHEDULED" && post.publishAt
      ? toDatetimeLocal(post.publishAt)
      : toDatetimeLocal(post.publishedAt);
    if (post.status === "SCHEDULED" && !publishAtValue) {
      publishAtValue = toDatetimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
    }
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      coverImage: post.coverImage,
      coverAlt: post.coverAlt,
      author: post.author,
      readingTime: post.readingTime,
      tags: post.tags,
      featured: post.featured,
      status: post.status,
      publishAt: publishAtValue,
      blogCategoryId: post.blogCategorySlug ? String(post.blogCategorySlug) : "",
      relatedProductSlugs: safeParseSlugs(post.relatedProductSlugs),
      faqs,
      seoTitle: post.seoTitle,
      metaDescription: post.metaDescription,
      focusKeyword: post.focusKeyword,
      secondaryKeywords: post.secondaryKeywords,
      ogTitle: post.ogTitle,
      ogDescription: post.ogDescription,
      canonicalUrl: post.canonicalUrl,
    });
  }, [post, allFaqs]);

  // blogCategoryId: we keep slug in state but need id at save; map slug→id
  const blogCatIdFromSlug = useMemo(() => {
    if (!form.blogCategoryId) return "";
    const cat = (blogCategories ?? []).find((c) => c.slug === form.blogCategoryId);
    return cat?.id ?? "";
  }, [form.blogCategoryId, blogCategories]);

  function set<K extends keyof BlogFormState>(key: K, value: BlogFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function estimateReadingTime() {
    const words = form.content
      .replace(/<[^>]+>/g, " ")
      .split(/\s+/)
      .filter(Boolean).length;
    const minutes = Math.max(1, Math.round(words / 200));
    set("readingTime", minutes);
    toast({ title: `Reading time set to ${minutes} min`, description: `${words} words at an average reading pace.` });
  }

  function generateSeoDefaults() {
    setForm((f) => ({
      ...f,
      seoTitle: f.seoTitle || `${f.title || "Blog post"} | Artistic by Khushiii`,
      metaDescription: f.metaDescription || f.excerpt.slice(0, 155),
      ogTitle: f.ogTitle || `${f.title} | Artistic by Khushiii`,
      ogDescription: f.ogDescription || f.excerpt.slice(0, 155),
    }));
    toast({ title: "SEO defaults filled" });
  }

  // internal link options for the editor
  const internalLinks: InternalLinkOption[] = useMemo(() => {
    const links: InternalLinkOption[] = [];
    for (const p of products?.items ?? []) links.push({ label: p.name, href: `/product/${p.slug}`, group: "Products" });
    for (const c of categories ?? []) links.push({ label: c.name, href: `#/category/${c.slug}`, group: "Categories" });
    for (const b of allBlogs?.items ?? []) if (b.id !== currentId) links.push({ label: b.title, href: `#/blog/${b.slug}`, group: "Blog posts" });
    return links;
  }, [products, categories, allBlogs, currentId]);

  const relatedProductOptions = useMemo(() => {
    const list = products?.items ?? [];
    const needle = relatedQ.trim().toLowerCase();
    return needle ? list.filter((p) => p.name.toLowerCase().includes(needle)) : list;
  }, [products, relatedQ]);

  async function save() {
    setSubmitted(true);
    if (!form.title.trim()) {
      setTab("content");
      toast({ title: "Blog title is required", variant: "destructive" });
      return;
    }
    if (form.status === "SCHEDULED" && !form.publishAt) {
      setTab("publish");
      toast({ title: "Pick a schedule date", description: "Scheduled posts need a publish date & time.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        slug: form.slug,
        excerpt: form.excerpt,
        content: form.content,
        coverImage: form.coverImage,
        coverAlt: form.coverAlt,
        author: form.author,
        readingTime: form.readingTime,
        tags: form.tags,
        featured: form.featured,
        status: form.status,
        publishAt: form.status === "SCHEDULED" && form.publishAt ? new Date(form.publishAt).toISOString() : "",
        blogCategoryId: blogCatIdFromSlug || null,
        relatedProductSlugs: JSON.stringify(form.relatedProductSlugs),
        seoTitle: form.seoTitle,
        metaDescription: form.metaDescription,
        focusKeyword: form.focusKeyword,
        secondaryKeywords: form.secondaryKeywords,
        ogTitle: form.ogTitle,
        ogDescription: form.ogDescription,
        canonicalUrl: form.canonicalUrl,
      };
      let blogId: string;
      if (isNew) {
        const res = await api.post<{ blog: PublicBlogPost }>("/api/admin/blogs", body);
        blogId = res.blog.id;
      } else {
        const res = await api.put<{ blog: PublicBlogPost }>(`/api/admin/blogs/${currentId}`, body);
        blogId = res.blog.id;
      }

      // FAQ sync
      const keptIds = new Set(form.faqs.filter((f) => f.id).map((f) => f.id as string));
      for (const faqId of initialFaqIds) {
        if (!keptIds.has(faqId)) await api.delete(`/api/admin/faqs/${faqId}`);
      }
      for (const faq of form.faqs) {
        if (!faq.question.trim() || !faq.answer.trim()) continue;
        if (faq.id) {
          await api.put(`/api/admin/faqs/${faq.id}`, { question: faq.question, answer: faq.answer });
        } else {
          await api.post("/api/admin/faqs", {
            question: faq.question,
            answer: faq.answer,
            entityType: "BLOG",
            entityId: blogId,
            displayOrder: 0,
            published: true,
          });
        }
      }

      toast({ title: "Blog post saved", description: form.title });
      for (const key of PUBLIC_CACHE_KEYS) void qc.invalidateQueries({ queryKey: key });
      void qc.invalidateQueries({ queryKey: ["admin", "blogs"] });
      void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      void qc.invalidateQueries({ queryKey: ["admin", "faqs"] });
      setInitialFaqIds(form.faqs.filter((f) => f.id).map((f) => f.id as string));

      if (isNew) setCurrentId(blogId);
    } catch (e) {
      toast({ title: "Save failed", description: errMsg(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (!isNew && isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" /> All blog posts
        </Button>
        <h2 className="font-display text-lg font-semibold">{isNew ? "New Blog Post" : `Edit: ${form.title || post?.title || ""}`}</h2>
        <BlogStatusBadge status={form.status} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="publish">Publish</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="relations">Relations & FAQs</TabsTrigger>
        </TabsList>

        {/* -------- Content -------- */}
        <TabsContent value="content" className="mt-4 space-y-4">
          <Field label="Title" required error={submitted && !form.title.trim() ? "Title is required" : undefined}>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. How to Care for Your Resin Art" aria-required />
          </Field>
          <SlugInput value={form.slug} onChange={(v) => set("slug", v)} from={form.title} />
          <Field label="Excerpt" counter={<CharCount text={form.excerpt} target={200} />} hint="Short summary shown on the blog listing.">
            <Textarea rows={2} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
          </Field>
          <Field label="Content">
            <RichTextEditor value={form.content} onChange={(v) => set("content", v)} rows={16} variant="full" internalLinks={internalLinks} />
          </Field>
          <Field label="Cover image">
            <MediaPickField
              value={form.coverImage}
              alt={form.coverAlt}
              onPick={(pick) => {
                set("coverImage", pick.url);
                set("coverAlt", pick.alt);
              }}
              onClear={() => {
                set("coverImage", "");
                set("coverAlt", "");
              }}
            />
          </Field>
          <Field label="Cover alt text">
            <Input value={form.coverAlt} onChange={(e) => set("coverAlt", e.target.value)} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Author">
              <Input value={form.author} onChange={(e) => set("author", e.target.value)} />
            </Field>
            <Field label="Reading time" hint="Auto-calculated from the content.">
              <div className="flex items-center gap-2">
                <Input type="number" value={form.readingTime} onChange={(e) => set("readingTime", Number(e.target.value) || 0)} className="w-24" />
                <span className="text-sm text-muted-foreground">min</span>
                <Button type="button" variant="outline" size="sm" onClick={estimateReadingTime}>
                  ✨ Auto-calculate
                </Button>
              </div>
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tags" hint="Comma separated.">
              <Input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="resin care, gifting ideas" />
            </Field>
            <Field label="Blog category">
              <Select value={form.blogCategoryId} onValueChange={(v) => set("blogCategoryId", v === "__none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="— none —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— none —</SelectItem>
                  {(blogCategories ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.slug}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="blog-featured" checked={form.featured} onCheckedChange={(v) => set("featured", v)} />
            <label htmlFor="blog-featured" className="text-sm">Featured post</label>
          </div>
        </TabsContent>

        {/* -------- Publish -------- */}
        <TabsContent value="publish" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <Field label="Status">
                <Select
                  value={form.status}
                  onValueChange={(v) => {
                    set("status", v);
                    if (v === "SCHEDULED" && !form.publishAt) {
                      const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
                      set("publishAt", toDatetimeLocal(d.toISOString()));
                    }
                  }}
                >
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft — not visible</SelectItem>
                    <SelectItem value="PUBLISHED">Published — live now</SelectItem>
                    <SelectItem value="SCHEDULED">Scheduled — goes live later</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {form.status === "SCHEDULED" ? (
                <Field label="Publish at" required error={submitted && !form.publishAt ? "Schedule date is required" : undefined} hint="The post automatically appears on the site after this time.">
                  <Input type="datetime-local" value={form.publishAt} onChange={(e) => set("publishAt", e.target.value)} className="w-64" />
                </Field>
              ) : null}
              {post?.publishedAt ? (
                <p className="text-sm text-muted-foreground">
                  Current published date: <span className="font-medium text-foreground">{fmtDate(post.publishedAt)}</span>
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {form.status === "PUBLISHED" ? "Publishing sets the published date automatically (first time)." : null}
                {form.status === "DRAFT" ? "Drafts are only visible here in the console." : null}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------- SEO -------- */}
        <TabsContent value="seo" className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">How this post appears on Google and social shares.</p>
            <Button type="button" variant="outline" size="sm" onClick={generateSeoDefaults}>
              ✨ Generate defaults
            </Button>
          </div>
          <GooglePreview
            title={form.seoTitle || form.title || "Blog post title"}
            url={`artisticbykhushi.com/blog/${form.slug || "your-slug"}`}
            description={form.metaDescription || form.excerpt}
          />
          <Field label="SEO title" counter={<CharCount text={form.seoTitle} target={60} />}>
            <Input value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
          </Field>
          <Field label="Meta description" counter={<CharCount text={form.metaDescription} target={160} />}>
            <Textarea rows={2} value={form.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Focus keyword">
              <Input value={form.focusKeyword} onChange={(e) => set("focusKeyword", e.target.value)} />
            </Field>
            <Field label="Secondary keywords" hint="Comma separated">
              <Input value={form.secondaryKeywords} onChange={(e) => set("secondaryKeywords", e.target.value)} />
            </Field>
            <Field label="OG title">
              <Input value={form.ogTitle} onChange={(e) => set("ogTitle", e.target.value)} />
            </Field>
            <Field label="Canonical URL">
              <Input value={form.canonicalUrl} onChange={(e) => set("canonicalUrl", e.target.value)} placeholder="https://…" />
            </Field>
          </div>
          <Field label="OG description">
            <Textarea rows={2} value={form.ogDescription} onChange={(e) => set("ogDescription", e.target.value)} />
          </Field>
        </TabsContent>

        {/* -------- Relations -------- */}
        <TabsContent value="relations" className="mt-4 space-y-4">
          <Field label="Related products" hint="Shown under this post as “You may also like”.">
            <div className="rounded-lg border">
              <div className="border-b p-2">
                <Input value={relatedQ} onChange={(e) => setRelatedQ(e.target.value)} placeholder="Filter products…" className="h-8" />
              </div>
              <div className="max-h-64 overflow-y-auto custom-scroll p-2 space-y-1">
                {relatedProductOptions.length === 0 ? (
                  <p className="p-2 text-sm text-muted-foreground">No products found.</p>
                ) : (
                  relatedProductOptions.map((p) => (
                    <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-secondary">
                      <Checkbox
                        checked={form.relatedProductSlugs.includes(p.slug)}
                        onCheckedChange={(checked) =>
                          set(
                            "relatedProductSlugs",
                            checked
                              ? [...form.relatedProductSlugs, p.slug]
                              : form.relatedProductSlugs.filter((s) => s !== p.slug),
                          )
                        }
                      />
                      <ImageThumb src={p.featuredImageUrl} alt="" size={24} />
                      <span className="truncate">{p.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </Field>

          <Field label="Post FAQs" hint="FAQ block shown on this blog post page.">
            <div className="space-y-2">
              {form.faqs.length === 0 ? <p className="text-sm text-muted-foreground">No FAQs yet.</p> : null}
              {form.faqs.map((faq, idx) => (
                <div key={idx} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <Field label={`Question ${idx + 1}`} className="flex-1">
                      <Input value={faq.question} onChange={(e) => set("faqs", form.faqs.map((f, i) => (i === idx ? { ...f, question: e.target.value } : f)))} />
                    </Field>
                    <Button type="button" variant="ghost" size="icon" className="mt-6 text-destructive" onClick={() => set("faqs", form.faqs.filter((_, i) => i !== idx))} aria-label="Remove FAQ">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Field label="Answer">
                    <Textarea rows={2} value={faq.answer} onChange={(e) => set("faqs", form.faqs.map((f, i) => (i === idx ? { ...f, answer: e.target.value } : f)))} />
                  </Field>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => set("faqs", [...form.faqs, { question: "", answer: "" }])}>
                <Plus className="mr-1 h-4 w-4" /> Add FAQ
              </Button>
              {blogFaqs.length > 0 ? (
                <p className="text-xs text-muted-foreground">{blogFaqs.length} FAQ{blogFaqs.length === 1 ? "" : "s"} currently live on this post.</p>
              ) : null}
            </div>
          </Field>
        </TabsContent>
      </Tabs>

      {/* sticky save bar */}
      <div className="sticky bottom-16 z-20 mt-6 rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur md:bottom-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{isNew ? "New post — not saved yet" : `Editing “${form.title}”`}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Spinner className="mr-1" /> : <Save className="mr-1 h-4 w-4" />}
              {saving ? "Saving…" : "Save post"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function safeParseSlugs(raw: string): string[] {
  try {
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}
