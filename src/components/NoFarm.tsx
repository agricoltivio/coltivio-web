import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAcceptFarmInviteMutation, useCreateFarmMutation } from "@/api/farm.queries";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import i18n from "@/i18n/index";

// GeoAdmin address search result shape
interface GeoAdminResult {
  id: number;
  attrs: {
    label: string;
    lon: number;
    lat: number;
  };
}

interface LocationSelection {
  label: string;
  lat: number;
  lng: number;
}

type Step =
  | "welcome"
  | "join"
  | "create-name"
  | "create-location"
  | "create-federal-id"
  | "create-confirm";

interface CreateData {
  name: string;
  location: LocationSelection | null;
  federalId: string | null;
}

// Strip HTML tags from GeoAdmin label strings (they return e.g. "<b>Bern</b>")
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

export function NoFarm() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("welcome");
  const [createData, setCreateData] = useState<CreateData>({ name: "", location: null, federalId: null });

  // Join farm state
  const [inviteCode, setInviteCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const acceptInviteMutation = useAcceptFarmInviteMutation();

  // Location search state
  const [addressQuery, setAddressQuery] = useState("");
  const [addressResults, setAddressResults] = useState<GeoAdminResult[]>([]);
  const [addressSearching, setAddressSearching] = useState(false);
  const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Federal ID search state
  const [federalIdQuery, setFederalIdQuery] = useState("");
  const [federalIdResults, setFederalIdResults] = useState<string[]>([]);
  const [federalIdSearching, setFederalIdSearching] = useState(false);
  const federalIdDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create farm mutation
  const createFarmMutation = useCreateFarmMutation();

  // Debounced GeoAdmin address search
  useEffect(() => {
    if (step !== "create-location") return;
    if (addressQuery.length < 3) {
      setAddressResults([]);
      return;
    }
    if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
    addressDebounceRef.current = setTimeout(async () => {
      setAddressSearching(true);
      try {
        const url = new URL("https://api.geo.admin.ch/rest/services/api/SearchServer");
        url.searchParams.set("searchText", addressQuery);
        url.searchParams.set("type", "locations");
        url.searchParams.set("origins", "address");
        url.searchParams.set("lang", i18n.language);
        const res = await fetch(url.toString());
        const json = (await res.json()) as { results: GeoAdminResult[] };
        setAddressResults(json.results ?? []);
      } catch {
        setAddressResults([]);
      } finally {
        setAddressSearching(false);
      }
    }, 600);
    return () => {
      if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
    };
  }, [addressQuery, step]);

  // When entering the federal ID step with no query, fetch nearby plots and extract unique farm IDs.
  // When the user types, switch to the federalFarmIds search endpoint (same as RN app).
  useEffect(() => {
    if (step !== "create-federal-id") return;
    if (!createData.location) return;
    if (federalIdDebounceRef.current) clearTimeout(federalIdDebounceRef.current);
    federalIdDebounceRef.current = setTimeout(async () => {
      setFederalIdSearching(true);
      try {
        if (federalIdQuery === "") {
          // Initial display: get nearby plots within 1km and extract unique farm IDs
          const response = await apiClient.GET("/v1/layers/plots/radius", {
            params: {
              query: {
                longitude: String(createData.location!.lng),
                latitude: String(createData.location!.lat),
                radiusInKm: "1",
              },
            },
          });
          const plots = response.data?.data.result ?? [];
          const uniqueIds = [...new Set(plots.map((p) => p.federalFarmId).filter((id): id is string => !!id))];
          setFederalIdResults(uniqueIds);
        } else {
          // Search: use the federalFarmIds endpoint with 3km radius
          const response = await apiClient.GET("/v1/layers/federalFarmIds", {
            params: {
              query: {
                query: federalIdQuery,
                limit: "20",
                longitude: String(createData.location!.lng),
                latitude: String(createData.location!.lat),
                radiusInKm: "3",
              },
            },
          });
          setFederalIdResults(response.data?.data.result ?? []);
        }
      } catch {
        setFederalIdResults([]);
      } finally {
        setFederalIdSearching(false);
      }
    }, federalIdQuery === "" ? 0 : 600);
    return () => {
      if (federalIdDebounceRef.current) clearTimeout(federalIdDebounceRef.current);
    };
  }, [federalIdQuery, step, createData.location]);

  function onJoinSubmit() {
    setJoinError(null);
    acceptInviteMutation.mutate(inviteCode.trim(), {
      onError: () => setJoinError(t("onboarding.join.invalid_code")),
    });
  }

  function onCreateSubmit() {
    if (!createData.location) return;
    createFarmMutation.mutate({
      name: createData.name,
      address: createData.location.label,
      location: { type: "Point", coordinates: [createData.location.lng, createData.location.lat] },
      federalId: createData.federalId ?? null,
    });
  }

  // Step indicator for create flow (1-based, out of 3)
  function StepIndicator({ current, total }: { current: number; total: number }) {
    return (
      <p className="text-sm text-muted-foreground mb-4">
        {current} / {total}
      </p>
    );
  }

  if (step === "welcome") {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Card className="max-w-sm w-full mx-auto">
          <CardHeader>
            <CardTitle>{t("onboarding.welcome.heading")}</CardTitle>
            <CardDescription>{t("onboarding.welcome.subheading")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={() => setStep("create-name")}>{t("onboarding.welcome.create_farm")}</Button>
            <Button variant="outline" onClick={() => setStep("join")}>{t("onboarding.welcome.join_farm")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "join") {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Card className="max-w-sm w-full mx-auto">
          <CardHeader>
            <CardTitle>{t("onboarding.join.heading")}</CardTitle>
            <CardDescription>{t("onboarding.join.subheading")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">{t("onboarding.join.email_info")}</p>
            <Field>
              <FieldLabel>{t("onboarding.join.code_label")}</FieldLabel>
              <Input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
              />
              {joinError && <FieldError>{joinError}</FieldError>}
            </Field>
            <Button
              onClick={onJoinSubmit}
              disabled={!inviteCode.trim() || acceptInviteMutation.isPending}
            >
              {t("onboarding.join.submit")}
            </Button>
            <Button variant="ghost" onClick={() => setStep("welcome")}>{t("common.back")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "create-name") {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Card className="max-w-sm w-full mx-auto">
          <CardHeader>
            <StepIndicator current={1} total={3} />
            <CardTitle>{t("onboarding.create.name.heading")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field>
              <FieldLabel>{t("onboarding.create.name.label")}</FieldLabel>
              <Input
                value={createData.name}
                onChange={(e) => setCreateData((prev) => ({ ...prev, name: e.target.value }))}
                autoFocus
              />
            </Field>
            <Button
              onClick={() => { setAddressQuery(""); setAddressResults([]); setStep("create-location"); }}
              disabled={!createData.name.trim()}
            >
              {t("common.next")}
            </Button>
            <Button variant="ghost" onClick={() => setStep("welcome")}>{t("common.back")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "create-location") {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Card className="max-w-sm w-full mx-auto">
          <CardHeader>
            <StepIndicator current={2} total={3} />
            <CardTitle>{t("onboarding.create.location.heading", { farmName: createData.name })}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field>
              <FieldLabel>{t("onboarding.create.location.label")}</FieldLabel>
              {/* Show selected location or search input */}
              {createData.location ? (
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-sm border rounded-md px-3 py-2 bg-muted">{createData.location.label}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateData((prev) => ({ ...prev, location: null }))}
                  >
                    ✕
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    value={addressQuery}
                    onChange={(e) => setAddressQuery(e.target.value)}
                    placeholder={t("onboarding.create.location.placeholder")}
                    autoFocus
                  />
                  {addressSearching && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
                  {addressResults.length > 0 && (
                    <ul className="border rounded-md divide-y max-h-48 overflow-y-auto">
                      {addressResults.map((result) => (
                        <li key={result.id}>
                          <button
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                            onClick={() => {
                              setCreateData((prev) => ({
                                ...prev,
                                location: {
                                  label: stripHtml(result.attrs.label),
                                  lat: result.attrs.lat,
                                  lng: result.attrs.lon,
                                },
                              }));
                              setAddressResults([]);
                            }}
                          >
                            {stripHtml(result.attrs.label)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </Field>
            <Button
              onClick={() => { setFederalIdQuery(""); setFederalIdResults([]); setStep("create-federal-id"); }}
              disabled={!createData.location}
            >
              {t("common.next")}
            </Button>
            <Button variant="ghost" onClick={() => setStep("create-name")}>{t("common.back")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "create-federal-id") {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Card className="max-w-sm w-full mx-auto">
          <CardHeader>
            <StepIndicator current={3} total={3} />
            <CardTitle>{t("onboarding.create.federal_id.heading")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field>
              <FieldLabel>{t("onboarding.create.federal_id.label")}</FieldLabel>
              {createData.federalId ? (
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-sm border rounded-md px-3 py-2 bg-muted">{createData.federalId}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateData((prev) => ({ ...prev, federalId: null }))}
                  >
                    ✕
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    value={federalIdQuery}
                    onChange={(e) => setFederalIdQuery(e.target.value)}
                    placeholder={t("onboarding.create.federal_id.label")}
                    autoFocus
                  />
                  {federalIdSearching && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
                  {federalIdResults.length > 0 && (
                    <ul className="border rounded-md divide-y max-h-48 overflow-y-auto">
                      {federalIdResults.map((id) => (
                        <li key={id}>
                          <button
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                            onClick={() => {
                              setCreateData((prev) => ({ ...prev, federalId: id }));
                              setFederalIdResults([]);
                            }}
                          >
                            {id}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </Field>
            <Button onClick={() => setStep("create-confirm")} disabled={!createData.federalId}>
              {t("common.next")}
            </Button>
            <Button
              variant="outline"
              onClick={() => { setCreateData((prev) => ({ ...prev, federalId: null })); setStep("create-confirm"); }}
            >
              {t("onboarding.create.federal_id.skip")}
            </Button>
            <Button variant="ghost" onClick={() => setStep("create-location")}>{t("common.back")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // create-confirm
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <Card className="max-w-sm w-full mx-auto">
        <CardHeader>
          <CardTitle>{t("onboarding.create.confirm.heading")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="text-sm space-y-2">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("onboarding.create.confirm.farm_name")}</dt>
              <dd className="font-medium">{createData.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("onboarding.create.confirm.location")}</dt>
              <dd className="font-medium text-right max-w-[200px]">{createData.location?.label}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("onboarding.create.confirm.federal_id")}</dt>
              <dd className="font-medium">{createData.federalId ?? t("onboarding.create.confirm.none")}</dd>
            </div>
          </dl>
          {createFarmMutation.isError && (
            <p className="text-sm text-destructive">{t("common.error")}</p>
          )}
          <Button onClick={onCreateSubmit} disabled={createFarmMutation.isPending}>
            {t("onboarding.create.confirm.submit")}
          </Button>
          <Button variant="ghost" onClick={() => setStep("create-federal-id")}>{t("common.back")}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
