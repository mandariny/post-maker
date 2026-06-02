import { Copy, LogIn, Save, Sparkles, Upload } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { BlogDraft, PlaceGroup, Trip, api } from './api';

const blankTrip = {
  title: '',
  region: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10)
};

export function App() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [tripForm, setTripForm] = useState(blankTrip);
  const [places, setPlaces] = useState<PlaceGroup[]>([]);
  const [draft, setDraft] = useState<BlogDraft | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    api.me()
      .then(setUser)
      .then(loadTrips)
      .catch(() => setStatus('Google 로그인 후 사용할 수 있습니다.'));
  }, []);

  async function loadTrips() {
    const data = await api.listTrips();
    setTrips(data);
    if (!activeTrip && data.length > 0) {
      setActiveTrip(data[0]);
      void loadPlaces(data[0].id);
    }
  }

  async function loadPlaces(tripId: number) {
    setPlaces(await api.listPlaces(tripId));
  }

  async function createTrip(event: FormEvent) {
    event.preventDefault();
    const created = await api.createTrip(tripForm);
    setTrips((current) => [created, ...current]);
    setActiveTrip(created);
    setTripForm(blankTrip);
    setPlaces([]);
    setDraft(null);
  }

  async function upload(files: FileList | null) {
    if (!activeTrip || !files?.length) return;
    setStatus('사진을 업로드하고 EXIF 정보를 분석하는 중입니다.');
    await api.uploadPhotos(activeTrip.id, files);
    await loadPlaces(activeTrip.id);
    setStatus('장소 그룹이 생성되었습니다.');
  }

  async function togglePlace(place: PlaceGroup, selected: boolean) {
    const updated = await api.updatePlace(activeTrip!.id, { ...place, selected });
    setPlaces((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }

  async function updateMemo(place: PlaceGroup, userMemo: string) {
    const next = { ...place, userMemo };
    setPlaces((current) => current.map((item) => (item.id === place.id ? next : item)));
  }

  async function saveMemo(place: PlaceGroup) {
    const updated = await api.updatePlace(activeTrip!.id, place);
    setPlaces((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }

  async function generateDraft() {
    if (!activeTrip) return;
    setStatus('블로그 초안을 생성하는 중입니다.');
    const generated = await api.generateDraft(activeTrip.id);
    setDraft(generated);
    setStatus('초안이 생성되었습니다.');
  }

  async function saveDraft() {
    if (!draft) return;
    setDraft(await api.updateDraft(draft));
    setStatus('초안을 저장했습니다.');
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div>
            <h1 className="text-xl font-semibold">여행 블로그 초안 자동화</h1>
            <p className="text-sm text-stone-500">사진 EXIF와 메모로 Markdown 초안을 생성합니다.</p>
          </div>
          {user ? (
            <div className="text-right text-sm">
              <div className="font-medium">{user.name}</div>
              <div className="text-stone-500">{user.email}</div>
            </div>
          ) : (
            <a className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-white" href={api.loginUrl}>
              <LogIn size={18} /> Google 로그인
            </a>
          )}
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <form className="rounded-md border border-stone-200 bg-white p-4" onSubmit={createTrip}>
            <h2 className="mb-3 text-base font-semibold">여행 기록 생성</h2>
            <Field label="제목" value={tripForm.title} onChange={(title) => setTripForm({ ...tripForm, title })} />
            <Field label="지역" value={tripForm.region} onChange={(region) => setTripForm({ ...tripForm, region })} />
            <Field label="시작일" type="date" value={tripForm.startDate} onChange={(startDate) => setTripForm({ ...tripForm, startDate })} />
            <Field label="종료일" type="date" value={tripForm.endDate} onChange={(endDate) => setTripForm({ ...tripForm, endDate })} />
            <button className="mt-2 w-full rounded-md bg-stone-900 px-4 py-2 text-white">생성</button>
          </form>

          <section className="rounded-md border border-stone-200 bg-white p-4">
            <h2 className="mb-3 text-base font-semibold">내 여행</h2>
            <div className="space-y-2">
              {trips.map((trip) => (
                <button
                  key={trip.id}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm ${activeTrip?.id === trip.id ? 'border-emerald-700 bg-emerald-50' : 'border-stone-200'}`}
                  onClick={() => {
                    setActiveTrip(trip);
                    setDraft(null);
                    void loadPlaces(trip.id);
                  }}
                >
                  <div className="font-medium">{trip.title}</div>
                  <div className="text-stone-500">{trip.region}</div>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="space-y-5">
          {activeTrip && (
            <>
              <div className="rounded-md border border-stone-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{activeTrip.title}</h2>
                    <p className="text-sm text-stone-500">{activeTrip.region} · {activeTrip.startDate} ~ {activeTrip.endDate}</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-white">
                    <Upload size={18} /> 사진 업로드
                    <input className="hidden" type="file" accept="image/*" multiple onChange={(event) => upload(event.target.files)} />
                  </label>
                </div>
                {status && <p className="mt-3 text-sm text-stone-600">{status}</p>}
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <section className="rounded-md border border-stone-200 bg-white p-4">
                  <h2 className="mb-3 text-base font-semibold">장소 선택 및 메모</h2>
                  <div className="space-y-3">
                    {places.map((place) => (
                      <div key={place.id} className="rounded-md border border-stone-200 p-3">
                        <label className="flex items-start gap-3">
                          <input className="mt-1 h-4 w-4" type="checkbox" checked={place.selected} onChange={(event) => togglePlace(place, event.target.checked)} />
                          <span>
                            <span className="block font-medium">{place.name}</span>
                            <span className="text-sm text-stone-500">{place.visitDate} · 사진 {place.photoCount}장</span>
                          </span>
                        </label>
                        <textarea
                          className="mt-3 min-h-24 w-full rounded-md border border-stone-200 p-2 text-sm"
                          placeholder="느낌, 추천 포인트, 아쉬웠던 점, 음식/카페/전시/풍경 키워드"
                          value={place.userMemo}
                          onChange={(event) => updateMemo(place, event.target.value)}
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
                      <button className="rounded-md border border-stone-300 p-2" onClick={generateDraft} title="초안 생성">
                        <Sparkles size={18} />
                      </button>
                      <button className="rounded-md border border-stone-300 p-2" onClick={saveDraft} title="저장">
                        <Save size={18} />
                      </button>
                      <button className="rounded-md border border-stone-300 p-2" onClick={() => draft && navigator.clipboard.writeText(draft.contentMarkdown)} title="복사">
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
                    value={draft?.contentMarkdown ?? ''}
                    onChange={(event) => draft && setDraft({ ...draft, contentMarkdown: event.target.value })}
                    placeholder="장소를 선택한 뒤 초안 생성 버튼을 누르세요."
                  />
                </section>
              </div>
            </>
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
