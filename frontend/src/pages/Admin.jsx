import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Crown, Users, Star, ChartBar, GearSix, FloppyDisk, Eye, EyeSlash } from "@phosphor-icons/react";

const StatCard = ({ label, value, accent = "text-teal-600" }) => (
  <div className="border-r border-b border-foreground/15 p-6 bg-white">
    <div className="text-xs font-bold tracking-wide uppercase mb-2">{label}</div>
    <div className={`text-4xl font-black tracking-tighter ${accent === "text-teal-600" ? "text-teal-600" : ""}`}>{value}</div>
  </div>
);

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [formulas, setFormulas] = useState([]);
  const [tutorials, setTutorials] = useState([]); 
  const [formulaSearch, setFormulaSearch] = useState("");
  const [settings, setSettings] = useState(null);
  const [showSecret, setShowSecret] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [editingTutorial, setEditingTutorial] = useState(null);
  const [showEditTutorial, setShowEditTutorial] = useState(false);
  const filteredFormulas = formulas.filter((f) =>
    f.name?.toLowerCase().includes(formulaSearch.toLowerCase())
  );
  

  const [showAddFormula, setShowAddFormula] = useState(false);
  const [editingFormula, setEditingFormula] = useState(null);
  const [showEditFormula, setShowEditFormula] = useState(false);
 const [newFormula, setNewFormula] = useState({
  name: "",
  category: "",
  syntax: "",
  description: "",
  example: "",
  difficulty: "Beginner",
});
   const [showAddTutorial, setShowAddTutorial] = useState(false);

   const [newTutorial, setNewTutorial] = useState({
    title: "",
    category: "",
    summary: "",
    content: "",
 });
  const loadAll = async () => {
    try {
 const [s, u, r, st, f, t] = await Promise.all([
  api.get("/admin/stats"),
  api.get("/admin/users"),
  api.get("/admin/reviews"),
  api.get("/admin/settings"),
  api.get("/functions"),
  api.get("/tutorials"),
]);

setStats(s.data);
setUsers(u.data);
setReviews(r.data);
setSettings(st.data);
setFormulas(f.data);
setTutorials(t.data);
      setStats(s.data); setUsers(u.data); setReviews(r.data); setSettings(st.data);setFormulas(f.data);
    } catch (e) {
      toast.error("Something went wrong. Try again.");
    }
  };

  useEffect(() => { if (user?.is_admin) loadAll(); }, [user]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_admin) return <Navigate to="/dashboard" replace />;

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const payload = {
        razorpay_key_id: settings.razorpay_key_id || "",
        razorpay_key_secret: settings.razorpay_key_secret || "",
        google_review_url: settings.google_review_url || "",
        pro_price_inr: parseInt(settings.pro_price_inr, 10) || 299,
        free_daily_chat_limit: parseInt(settings.free_daily_chat_limit, 10) || 5,
      };
      const { data } = await api.put("/admin/settings", payload);
      setSettings(data);
      toast.success("Settings saved");
    } catch (e) {
      toast.error("Something went wrong. Try again.");
    } finally {
      setSavingSettings(false);
    }
  };
       const saveFormula = async () => {
         if (!newFormula.name || !newFormula.category || !newFormula.syntax) {
           toast.error("Please fill all required fields");
           return;
         }

         try {
           const { data } = await api.post("/admin/formulas", newFormula);

           setFormulas([...formulas, data]);

           setNewFormula({
             name: "",
             category: "",
             syntax: "",
             description: "",
             example: "",
             difficulty: "Beginner",
           });

           setShowAddFormula(false);

           toast.success("Formula saved to database");
         } catch (e) {
           toast.error(
             "Something went wrong. Try again."
           );
         }
       };
           const deleteFormula = async (formula) => {
             if (!window.confirm(`Delete ${formula.name}?`)) return;

             try {
               await api.delete(`/admin/formulas/${formula.id}`);

               setFormulas(
                 formulas.filter(
                   (f) => (f.id || f._id) !== (formula.id || formula._id)
                 )
               );

               toast.success("Formula deleted permanently");
             } catch (e) {
               toast.error(
                 "Something went wrong. Try again."
               );
             }
           };
            const updateFormula = async () => {
  try {
    await api.put(
      `/admin/formulas/${editingFormula.id}`,
      editingFormula
    );

    setFormulas(
      formulas.map((f) =>
        (f.id || f._id) === (editingFormula.id || editingFormula._id)
          ? editingFormula
          : f
      )
    );

               setShowEditFormula(false);

               toast.success("Formula updated");
             } catch (e) {
               toast.error(
                 "Something went wrong. Try again."
               );
              }
            }; 
            const saveTutorial = async () => {
              if (!newTutorial.title || !newTutorial.category) {
                toast.error("Please fill required fields");
                return;
              }

              try {
                const { data } = await api.post(
                  "/admin/tutorials",
                  newTutorial
                );

                setTutorials([...tutorials, data]);

                setNewTutorial({
                title: "",
                category: "",
                summary: "",
                content: "",
              });
 
              setShowAddTutorial(false);

              toast.success("Tutorial saved");
            } catch (e) {
              toast.error("Something went wrong. Try again.");
            }
          };     
            const deleteTutorial = async (tutorial) => {
  if (!window.confirm(`Delete ${tutorial.title}?`)) return;

  try {
    await api.delete(
      `/admin/tutorials/${tutorial.id}`
    );

    setTutorials(
      tutorials.filter(
        (t) => t.id !== tutorial.id
      )
    );

    toast.success("Tutorial deleted");
  } catch (e) {
    toast.error("Failed to delete tutorial");
  }
};   
            const editFormula = (formula) => {
              setEditingFormula({ ...formula });
              setShowEditFormula(true);

              setTimeout(() => {
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                });
              }, 100);
            };
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10 lg:py-14" data-testid="admin-page">
        <div className="flex items-center gap-3 mb-3">
          <Crown size={28} weight="fill" className="text-teal-600" />
          <div className="text-xs font-bold tracking-wide uppercase klein">ADMIN CONSOLE</div>
        </div>
        <h1 className="text-4xl lg:text-5xl font-black tracking-tighter mb-3">Hello, boss.</h1>
        <p className="text-muted-foreground mb-8">Stats, users, reviews, and payment settings — all yours.</p>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="rounded-none bg-secondary p-0 h-auto border border-foreground/15 inline-flex w-auto">
            <TabsTrigger value="overview" className="rounded-none px-5 py-3 data-[state=active]:bg-teal-600 data-[state=active]:text-white" data-testid="tab-overview">
              <ChartBar size={16} className="mr-2" /> Overview
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-none px-5 py-3 data-[state=active]:bg-teal-600 data-[state=active]:text-white" data-testid="tab-settings">
              <GearSix size={16} className="mr-2" /> Settings
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-none px-5 py-3 data-[state=active]:bg-teal-600 data-[state=active]:text-white" data-testid="tab-users">
              <Users size={16} className="mr-2" /> Users
            </TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-none px-5 py-3 data-[state=active]:bg-teal-600 data-[state=active]:text-white" data-testid="tab-reviews">
              <Star size={16} className="mr-2" /> Reviews
            </TabsTrigger>
            <TabsTrigger
              value="formulas"
              className="rounded-none px-5 py-3 data-[state=active]:bg-teal-600 data-[state=active]:text-white"
            >
             Formulas
            </TabsTrigger>

             <TabsTrigger
               value="tutorials"
               className="rounded-none px-5 py-3 data-[state=active]:bg-teal-600 data-[state=active]:text-white"
              >
               Tutorials
              </TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="mt-6">
            {stats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-l border-t border-foreground/15">
                <StatCard label="TOTAL USERS" value={stats.total_users} />
                <StatCard label="PRO USERS" value={stats.pro_users} />
                <StatCard label="FREE USERS" value={stats.free_users} />
                <StatCard label="TOTAL CHATS" value={stats.total_chats} />
                <StatCard label="REVIEWS" value={stats.total_reviews} />
                <StatCard label="AVG RATING" value={stats.avg_rating || "—"} />
                <StatCard label="REVENUE (INR)" value={`₹${stats.total_revenue_inr}`} />
                <StatCard label="CONVERSION" value={stats.total_users ? `${Math.round((stats.pro_users / stats.total_users) * 100)}%` : "0%"} />
              </div>
            ) : <div className="text-xs font-bold tracking-wide uppercase text-muted-foreground">Loading…</div>}
          </TabsContent>
          <TabsContent value="tutorials" className="mt-6">
            <div className="mb-4 flex justify-between items-center">
              
             <div>
               <h2 className="text-2xl font-bold">Tutorials</h2>
               <p className="text-muted-foreground">
                 Total Tutorials: {tutorials.length}
               </p>
             </div>

             <button
               className="bg-black text-white px-4 py-2 rounded"
               onClick={() => setShowAddTutorial(!showAddTutorial)}
             >
               + Add Tutorial
             </button>
           </div>
              {showAddTutorial && (
                <div className="border p-4 rounded mb-4 bg-white">
                  <h3 className="font-bold mb-3">Add New Tutorial</h3>

               <input
      placeholder="Tutorial Title"
      className="w-full border p-2 rounded mb-2"
      value={newTutorial.title}
      onChange={(e) =>
        setNewTutorial({
          ...newTutorial,
          title: e.target.value,
        })
      }
    />

    <input
      placeholder="Category"
      className="w-full border p-2 rounded mb-2"
      value={newTutorial.category}
      onChange={(e) =>
        setNewTutorial({
          ...newTutorial,
          category: e.target.value,
        })
      }
    />

    <textarea
      placeholder="Summary"
      rows={3}
      className="w-full border p-2 rounded mb-2"
      value={newTutorial.summary}
      onChange={(e) =>
        setNewTutorial({
          ...newTutorial,
          summary: e.target.value,
        })
      }
    />

    <textarea
      placeholder="Tutorial Content"
      rows={6}
      className="w-full border p-2 rounded mb-2"
      value={newTutorial.content}
      onChange={(e) =>
        setNewTutorial({
          ...newTutorial,
          content: e.target.value,
        })
      }
    />

    <button
      className="bg-blue-600 text-white px-4 py-2 rounded"
      onClick={saveTutorial}
    >
      Save Tutorial
    </button>
  </div>
)}
             <div className="border border-foreground/15 overflow-x-auto">
              <table className="w-full text-sm">
               <thead className="bg-secondary">
                 <tr>
                  <th className="text-left px-4 py-3">Title</th>
                  <th className="text-left px-4 py-3">Category</th>
                  <th className="text-left px-4 py-3">Summary</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {tutorials.map((t) => (
                  <tr key={t.id} className="border-t border-foreground/15">
                   <td className="px-4 py-3 font-bold">
                     {t.title}
                   </td>

                   <td className="px-4 py-3">
                     {t.category}
                   </td>

                   <td className="px-4 py-3">
                     {t.summary}
                   </td>
                   <td className="px-4 py-3">
                    <button
                      className="bg-red-600 text-white px-3 py-1 rounded text-xs"
                      onClick={() => deleteTutorial(t)}
                    >
                      Delete
                    </button>
                    <button
                       className="bg-blue-600 text-white px-3 py-1 rounded text-xs mr-2"
                       onClick={() => editTutorial(t)}
                     >
                     Edit
                   </button>
                   </td>
                 </ tr>
               ))}
             </tbody>
           </table>
         </div>
       </TabsContent>
          {/* SETTINGS */}
          <TabsContent value="settings" className="mt-6">
            {settings ? (
              <div className="max-w-2xl border border-foreground/15 p-8 bg-white">
                <div className="text-xs font-bold tracking-wide uppercase text-teal-600 mb-6">PAYMENT & APP CONFIG</div>

                <div className="space-y-5">
                  <div>
                    <Label className="overline">RAZORPAY KEY ID</Label>
                    <Input
                      value={settings.razorpay_key_id || ""}
                      onChange={(e) => setSettings({ ...settings, razorpay_key_id: e.target.value })}
                      placeholder="rzp_test_xxxxxxxxxxxx"
                      className="rounded-none border-foreground/30 h-11 mt-2 font-mono text-sm"
                      data-testid="settings-razorpay-key-id"
                    />
                    <p className="text-xs text-muted-foreground mt-1">From Razorpay Dashboard → Settings → API Keys</p>
                  </div>

                  <div>
                    <Label className="overline">RAZORPAY KEY SECRET</Label>
                    <div className="relative mt-2">
                      <Input
                        type={showSecret ? "text" : "password"}
                        value={settings.razorpay_key_secret || ""}
                        onChange={(e) => setSettings({ ...settings, razorpay_key_secret: e.target.value })}
                        placeholder="••••••••••••••••"
                        className="rounded-none border-foreground/30 h-11 font-mono text-sm pr-10"
                        data-testid="settings-razorpay-secret"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showSecret ? <EyeSlash size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Stored encrypted in DB. Never exposed to frontend.</p>
                  </div>

                  <div>
                    <Label className="overline">GOOGLE REVIEW URL</Label>
                    <Input
                      value={settings.google_review_url || ""}
                      onChange={(e) => setSettings({ ...settings, google_review_url: e.target.value })}
                      placeholder="https://g.page/r/your-business/review"
                      className="rounded-none border-foreground/30 h-11 mt-2 text-sm"
                      data-testid="settings-google-review"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Get from Google Business Profile → Reviews → Get more reviews</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="overline">PRO PRICE (₹/month)</Label>
                      <Input
                        type="number"
                        value={settings.pro_price_inr || 299}
                        onChange={(e) => setSettings({ ...settings, pro_price_inr: e.target.value })}
                        className="rounded-none border-foreground/30 h-11 mt-2"
                        data-testid="settings-pro-price"
                      />
                    </div>
                    <div>
                      <Label className="overline">FREE DAILY CHAT LIMIT</Label>
                      <Input
                        type="number"
                        value={settings.free_daily_chat_limit || 5}
                        onChange={(e) => setSettings({ ...settings, free_daily_chat_limit: e.target.value })}
                        className="rounded-none border-foreground/30 h-11 mt-2"
                        data-testid="settings-chat-limit"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={saveSettings}
                    disabled={savingSettings}
                    className="rounded-none bg-teal-600 hover:bg-[#0D9488]/90 text-white h-12 px-8"
                    data-testid="settings-save-button"
                  >
                    <FloppyDisk size={16} className="mr-2" />
                    {savingSettings ? "Saving…" : "Save settings"}
                  </Button>
                </div>
              </div>
            ) : <div className="text-xs font-bold tracking-wide uppercase text-muted-foreground">Loading…</div>}
          </TabsContent>

          {/* USERS */}
          <TabsContent value="users" className="mt-6">
            <div className="border border-foreground/15 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left px-4 py-3 overline">NAME</th>
                    <th className="text-left px-4 py-3 overline">EMAIL</th>
                    <th className="text-left px-4 py-3 overline">PLAN</th>
                    <th className="text-left px-4 py-3 overline">JOINED</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-foreground/15 hover:bg-secondary/50" data-testid={`user-row-${u.id}`}>
                      <td className="px-4 py-3 font-medium">
                        {u.name}
                        {u.is_admin && <Badge className="ml-2 rounded-none bg-teal-600 text-xs">ADMIN</Badge>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">
                        {u.is_pro ? <Badge className="rounded-none bg-black text-white"><Crown size={11} className="mr-1" weight="fill" />PRO</Badge>
                                  : <Badge variant="outline" className="rounded-none border-foreground/20">Free</Badge>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{u.created_at?.slice(0, 10)}</td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-12 text-center overline text-muted-foreground">NO USERS</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* REVIEWS */}
          <TabsContent value="reviews" className="mt-6">
            {reviews.length === 0 ? (
              <div className="border border-foreground/15 p-12 text-center">
                <div className="text-xs font-bold tracking-wide uppercase mb-2">NO REVIEWS YET</div>
                <p className="text-muted-foreground text-sm">Once users leave reviews, they'll show here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-l border-t border-foreground/15">
                {reviews.map((r) => (
                  <div key={r.id} className="border-r border-b border-foreground/15 p-6 bg-white" data-testid={`admin-review-${r.id}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-bold">{r.user_name}</div>
                      <div className="flex">
                        {[1,2,3,4,5].map((i) => (
                          <Star key={i} size={16} weight={i <= r.rating ? "fill" : "regular"} className={i <= r.rating ? "text-teal-600" : "text-foreground/20"} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed">{r.comment}</p>
                    <div className="text-xs font-bold tracking-wide uppercase text-muted-foreground mt-3">{r.updated_at?.slice(0, 10)}</div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          {/* FORMULAS */}
             <TabsContent value="formulas" className="mt-6">
              <div className="mb-4 flex justify-end">
                <button
                  className="bg-black text-white px-4 py-2 rounded"
                  onClick={() => setShowAddFormula(!showAddFormula)}
                >
                  + Add Formula
                </button>
               </div>
               {showAddFormula && (
                <div className="border p-4 rounded mb-4 bg-white">
                  <h3 className="font-bold mb-3">Add New Formula</h3>
                
                  <input
                    placeholder="Formula Name"
                    className="w-full border p-2 rounded mb-2"
                    value={newFormula.name}
                    onChange={(e) =>
                      setNewFormula({ ...newFormula, name: e.target.value })
               
                    }
                 />
                 

                   <input
                     placeholder="Category"
                     className="w-full border p-2 rounded mb-2"
                     value={newFormula.category}
                     onChange={(e) =>
                       setNewFormula({ ...newFormula, category: e.target.value })
                    }
                  />
                   <input
                     placeholder="Syntax"
                     className="w-full border p-2 rounded mb-2"
                     value={newFormula.syntax}
                     onChange={(e) =>
                       setNewFormula({ ...newFormula, syntax: e.target.value })
                     }              
                  />

                    <textarea
                      placeholder="Description"
                      className="w-full border p-2 rounded mb-2"
                      rows={3}
                      value={newFormula.description}
                      onChange={(e) =>
                         setNewFormula({ ...newFormula, description: e.target.value })
                      }
                   /> 
    
       <button
  className="bg-blue-600 text-white px-4 py-2 rounded"
  onClick={saveFormula}
>
      Save Formula
    </button>
  </div>
)}
               {showEditFormula && editingFormula && (
                 <div className="border p-4 rounded mb-4 bg-yellow-50">
                 <h3 className="font-bold mb-3">Edit Formula</h3>

    <input
      placeholder="Formula Name"
      className="w-full border p-2 rounded mb-2"
      value={editingFormula.name}
      onChange={(e) =>
        setEditingFormula({
          ...editingFormula,
          name: e.target.value,
        })
      }
    />

    <input
      placeholder="Category"
      className="w-full border p-2 rounded mb-2"
      value={editingFormula.category}
      onChange={(e) =>
        setEditingFormula({
          ...editingFormula,
          category: e.target.value,
        })
      }
    />

    <input
      placeholder="Syntax"
      className="w-full border p-2 rounded mb-2"
      value={editingFormula.syntax}
      onChange={(e) =>
        setEditingFormula({
          ...editingFormula,
          syntax: e.target.value,
        })
      }
    />

    <textarea
      placeholder="Description"
      rows={3}
      className="w-full border p-2 rounded mb-2"
      value={editingFormula.description || ""}
      onChange={(e) =>
        setEditingFormula({
          ...editingFormula,
          description: e.target.value,
        })
      }
    />

    <div className="flex gap-2">
      <button
         className="bg-green-600 text-white px-4 py-2 rounded"
         onClick={updateFormula}
        >
         Update Formula
      </button>

      <button
        className="bg-gray-500 text-white px-4 py-2 rounded"
        onClick={() => setShowEditFormula(false)}
      >
        Cancel
      </button>
    </div>
  </div>
)}

              <div className="mb-4">
                <input
                  type="text"
                  placeholder="🔍 Search formula..."
                  value={formulaSearch}
                  onChange={(e) => setFormulaSearch(e.target.value)}
                  className="w-full border p-3 rounded"
                />
              </div>
               <div className="border border-foreground/15 overflow-x-auto">
              <table className="w-full text-sm">
      <thead className="bg-secondary">
        <tr>
          <th className="text-left px-4 py-3">Name</th>
          <th className="text-left px-4 py-3">Category</th>
          <th className="text-left px-4 py-3">Syntax</th>
          <th className="text-left px-4 py-3">Difficulty</th>
          <th className="text-left px-4 py-3">Actions</th>
        </tr>
      </thead>

      <tbody>
        {filteredFormulas.map((f) => (
          <tr key={f.id || f._id} className="border-t border-foreground/15">
            <td className="px-4 py-3 font-bold">{f.name}</td>
            <td className="px-4 py-3">{f.category}</td>
            <td className="px-4 py-3">{f.syntax}</td>
            <td className="px-4 py-3">{f.difficulty}</td>
            <td className="px-4 py-3 flex gap-2">
              <button
                className="bg-blue-600 text-white px-3 py-1 rounded text-xs"
                onClick={() => editFormula(f)}
              >
                Edit
              </button>

              <button
                className="bg-red-600 text-white px-3 py-1 rounded text-xs"
                onClick={() => deleteFormula(f)}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
