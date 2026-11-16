import { useMemo } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import FavBtn from "./FavBtn";
import CopyBtn from "./CopyBtn";
import { useAsyncNow } from "../../hooks/Fetch";
import { dictHandlers } from "./DictHandler";
import { useI18n } from "../../hooks/I18n";
import { loadDictionary } from "./loadDictionary";
import { normalizeWordForms } from "../../libs/favoriteWordForms";

function DictionaryEntry({
  text,
  enDict,
  source,
  toLang,
  apiSetting,
  translateVariants,
}) {
  const i18n = useI18n();
  const dict = dictHandlers[enDict];
  const lookup = useMemo(
    () =>
      dict
        ? async (query) => ({
            value: await loadDictionary({
              dict,
              text: query.text,
              toLang,
              apiSetting,
              translateVariants,
            }),
          })
        : undefined,
    [dict, toLang, apiSetting, translateVariants]
  );
  const query = useMemo(() => ({ text, toLang }), [text, toLang]);
  const { loading, error, data: response } = useAsyncNow(lookup, query);
  const data = response?.value;
  const ready = !dict || Boolean(error) || response != null;
  const result = !loading && !error ? data : null;
  const realWord = (result && dict?.reWord(result)) || text;
  const copyText = result
    ? [realWord, ...(dict?.toText(result) || [])].join("\n")
    : text;
  const forms = useMemo(
    () => normalizeWordForms(dict?.wordForms?.(result)),
    [dict, result]
  );

  return (
    <Stack spacing={1}>
      {text && (
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="subtitle1" style={{ fontWeight: "bold" }}>
            {realWord}
          </Typography>
          <Stack direction="row" justifyContent="space-between">
            <CopyBtn
              text={copyText}
              title={i18n("copy")}
              copiedLabel={i18n("copy_success", "Copied")}
            />
            <FavBtn
              word={realWord}
              forms={forms}
              source={source}
              ready={ready}
              title={i18n("collect")}
            />
          </Stack>
        </Stack>
      )}
      <Divider />
      {dict &&
        (loading || !ready ? (
          <CircularProgress size={16} />
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : result ? (
          <Typography component="div">
            {dict.uiAudio(result)}
            {dict.uiTrans(result)}
          </Typography>
        ) : (
          <Typography>Not found!</Typography>
        ))}
    </Stack>
  );
}

export default function DictCont({
  text,
  enDict,
  source = null,
  toLang,
  apiSetting,
  translateVariants = true,
}) {
  // A query/dictionary change owns a fresh lookup, so stale data cannot be saved
  // as another word's forms, even before the async hook's effect has run.
  return (
    <DictionaryEntry
      key={JSON.stringify([
        enDict,
        text,
        toLang,
        apiSetting?.apiSlug,
        translateVariants,
      ])}
      text={text}
      enDict={enDict}
      source={source}
      toLang={toLang}
      apiSetting={apiSetting}
      translateVariants={translateVariants}
    />
  );
}
