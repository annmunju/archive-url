import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/ko";

dayjs.extend(relativeTime);
dayjs.locale("ko");

export function fromNow(isoDate: string): string {
  return dayjs(isoDate).fromNow();
}
