import { Copy, LogOut, Save, Sparkles, Upload } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { travelApi } from './travelApi';
import { BlogDraft, PlaceGroupWithPhotos, Trip, TripForm } from './types';

const today = new Date().toISOString().slice(0, 10);
const blankTrip: TripForm = {
  title: '',
  region: '',
  start_date: today,
  end_date: today
};

type UserProfile = {
  id: string;
  email: string;
  name: string;
};

export function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [tripForm, setTripForm] = useState<TripForm>(blankTrip);
  const [places, setPlaces] = useState<PlaceGroupWithPhotos[]>([]);
  const [draft, setDraft] = useState<BlogDraft | null>(null);
  const [status, setStatus] = useState('Supabase Google 로그인 후 사용할 수 있습니다.');
  const [busy, setBusy] = useState(false);

  const selectedCount = useMemo(() => places.filter((place) => place.selected).length, [places]);

  useEffect(() => {
    void initialize();
    const subscription = travelApi.onAuthChange((profile) => {
      setUser(profile);
      if (profile) void loadTrips();
    });
    return () => subscription.data.subscription.unsubscribe();
  }, []);

  async function initialize() {
    const profile = await travelApi.currentUser();
    setUser(profile);
    if (profile) {
      setStatus('');
      await loadTrips();
    }
  }

  async function loadTrips() {
    const data = await travelApi.listTrips();
    setTrips(data);
    if (!activeTrip && data.length > 0) {
      await selectTrip(data[0]);
    }
  }

  async function selectTrip(trip: Trip) {
    setActiveTrip(trip);
    setDraft(await travelApi.latestDraft(trip.id));
    setPlaces(await travelApi.listPlaces(trip.id));
  }

  async function createTrip(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const created = await travelApi.createTrip(tripForm);
      setTrips((current) => [created, ...current]);
      setTripForm(blankTrip);
      await selectTrip(created);
      setStatus('여행 기록을 생성했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function upload(files: FileList | null) {
    if (!activeTrip || !files?.length) return;
    setBusy(true);
    setStatus('사진 업로드, EXIF 추출, 장소명 추정 중입니다.');
    try {
      await travelApi.uploadPhotos(activeTrip, files);
      setPlaces(await travelApi.listPlaces(activeTrip.id));
      setStatus('사진과 장소 그룹을 정리했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function togglePlace(place: PlaceGroupWithPhotos, selected: boolean) {
    const updated = await travelApi.updatePlace({ ...place, selected });
    setPlaces((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
  }

  function editMemo(place: PlaceGroupWithPhotos, userMemo: string) {
    setPlaces((current) => current.map((item) => (item.id === place.id ? { ...item, user_memo: userMemo } : item)));
  }

  async function saveMemo(place: PlaceGroupWithPhotos) {
    const updated = await travelApi.updatePlace(place);
    setPlaces((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
  }

  async function generateDraft() {
    if (!activeTrip) return;
    setBusy(true);
    setStatus('OpenAI API로 블로그 초안을 생성하는 중입니다.');
    try {
      const generated = await travelApi.generateDraft(activeTrip, places);
      setDraft(generated);
      setStatus('Markdown 초안을 생성했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (!draft) return;
    const saved = await travelApi.updateDraft(draft);
    setDraft(saved);
    setStatus('초안을 저장했습니다.');
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4]">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div>
            <h1 className="text-xl font-semibold">여행 블로그 초안 자동화</h1>
            <p className="text-sm text-stone-500">Supabase, EXIF, Kakao Local API, OpenAI API 기반 MVP</p>
          </div>
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right text-sm">
                <div className="font-medium">{user.name}</div>
                <div className="text-stone-500">{user.email}</div>
              </div>
              <button className="rounded-md border border-stone-300 p-2" onClick={travelApi.signOut} title="로그아웃">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button className="rounded-md bg-emerald-700 px-4 py-2 text-white" onClick={travelApi.signInWithGoogle}>
              Google로 로그인
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <form className="rounded-md border border-stone-200 bg-white p-4" onSubmit={createTrip}>
            <h2 className="mb-3 text-base font-semibold">여행 기록 생성</h2>
            <Field label="여행 제목" value={tripForm.title} onChange={(title) => setTripForm({ ...tripForm, title })} />
            <Field label="여행 지역" value={tripForm.region} onChange={(region) => setTripForm({ ...tripForm, region })} />
            <Field label="시작일" type="date" value={tripForm.start_date} onChange={(start_date) => setTripForm({ ...tripForm, start_date })} />
            <Field label="종료일" type="date" value={tripForm.end_date} onChange={(end_date) => setTripForm({ ...tripForm, end_date })} />
            <button className="mt-2 w-full rounded-md bg-stone-900 px-4 py-2 text-white disabled:opacity-50" disabled={!user || busy}>
              생성
            </button>
          </form>

          <section className="rounded-md border border-stone-200 bg-white p-4">
            <h2 className="mb-3 text-base font-semibold">내 여행</h2>
            <div className="space-y-2">
              {trips.map((trip) => (
                <button
                  key={trip.id}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm ${activeTrip?.id === trip.id ? 'border-emerald-700 bg-emerald-50' : 'border-stone-200'}`}
                  onClick={() => selectTrip(trip)}
                >
                  <div className="font-medium">{trip.title}</div>
                  <div className="text-stone-500">{trip.region}</div>
                </button>
              ))}
              {trips.length === 0 && <p className="text-sm text-stone-500">아직 생성한 여행 기록이 없습니다.</p>}
            </div>
          </section>
        </aside>

        <section className="space-y-5">
          <div className="rounded-md border border-stone-200 bg-white p-4">
            {activeTrip ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{activeTrip.title}</h2>
                  <p className="text-sm text-stone-500">
                    {activeTrip.region} · {activeTrip.start_date} ~ {activeTrip.end_date}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">선택 장소 {selectedCount}곳 · 전체 장소 {places.length}곳</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-white">
                  <Upload size={18} /> 사진 업로드
                  <input className="hidden" type="file" accept="image/*" multiple onChange={(event) => upload(event.target.files)} />
                </label>
              </div>
            ) : (
              <p className="text-sm text-stone-600">여행 기록을 만들거나 기존 기록을 선택하세요.</p>
            )}
            {status && <p className="mt-3 text-sm text-stone-600">{status}</p>}
          </div>

          {activeTrip && (
            <div className="grid gap-5 xl:grid-cols-2">
              <section className="rounded-md border border-stone-200 bg-white p-4">
                <h2 className="mb-3 text-base font-semibold">장소 선택 및 메모</h2>
                <div className="space-y-3">
                  {places.map((place) => (
                    <div key={place.id} className="rounded-md border border-stone-200 p-3">
                      <label className="flex items-start gap-3">
                        <input
                          className="mt-1 h-4 w-4"
                          type="checkbox"
                          checked={place.selected}
                          onChange={(event) => togglePlace(place, event.target.checked)}
                        />
                        <span>
                          <span className="block font-medium">{place.name}</span>
                          <span className="text-sm text-stone-500">
                            {place.visit_date} · 사진 {place.photo_count}장
                          </span>
                        </span>
                      </label>

                      {place.photos.length > 0 && (
                        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
                          {place.photos.slice(0, 10).map((photo) => (
                            <img
                              key={photo.id}
                              src={photo.signed_url}
                              alt={photo.original_file_name}
                              className="aspect-square w-full rounded-md border border-stone-200 object-cover"
                              loading="lazy"
                            />
                          ))}
                        </div>
                      )}

                      <textarea
                        className="mt-3 min-h-24 w-full rounded-md border border-stone-200 p-2 text-sm"
                        placeholder="느낌, 추천 포인트, 아쉬웠던 점, 음식/카페/전시/풍경 키워드"
                        value={place.user_memo}
                        onChange={(event) => editMemo(place, event.target.value)}
                        onBlur={() => saveMemo(place)}
                      />
                    </div>
                  ))}
                  {places.length === 0 && <p className="text-sm text-stone-500">사진을 업로드하면 장소 그룹이 표시됩니다.</p>}
                </div>
              </section>

              <section className="rounded-md border border-stone-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold">Markdown 초안</h2>
                  <div className="flex gap-2">
                    <button className="rounded-md border border-stone-300 p-2 disabled:opacity-50" onClick={generateDraft} disabled={busy || selectedCount === 0} title="초안 생성">
                      <Sparkles size={18} />
                    </button>
                    <button className="rounded-md border border-stone-300 p-2 disabled:opacity-50" onClick={saveDraft} disabled={!draft} title="저장">
                      <Save size={18} />
                    </button>
                    <button className="rounded-md border border-stone-300 p-2 disabled:opacity-50" onClick={() => draft && navigator.clipboard.writeText(draft.content_markdown)} disabled={!draft} title="복사">
                      <Copy size={18} />
                    </button>
                  </div>
                </div>
                <input
                  className="mb-3 w-full rounded-md border border-stone-200 p-2 font-medium"
                  value={draft?.title ?? ''}
                  onChange={(event) => draft && setDraft({ ...draft, title: event.target.value })}
                  placeholder="초안 제목"
                />
                <textarea
                  className="min-h-[520px] w-full rounded-md border border-stone-200 p-3 font-mono text-sm"
                  value={draft?.content_markdown ?? ''}
                  onChange={(event) => draft && setDraft({ ...draft, content_markdown: event.target.value })}
                  placeholder="장소를 선택한 뒤 초안 생성 버튼을 누르세요."
                />
              </section>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="mb-3 block text-sm">
      <span className="mb-1 block text-stone-600">{label}</span>
      <input className="w-full rounded-md border border-stone-200 p-2" required type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
