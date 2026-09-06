/**
 * File Name : features/common/hooks/useServerSnapshotQuery.test.ts
 * Description : 서버 snapshot 우선 Query cache 동기화 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.27  임도헌   Created   기존 cache가 있어도 새 서버 snapshot이 첫 렌더에 노출되는지 검증
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { useServerSnapshotQuery } from "./useServerSnapshotQuery";

interface SnapshotProbeProps {
  snapshot: { count: number };
}

/** 테스트 화면에 Hook이 선택한 count를 출력한다. */
function SnapshotProbe({ snapshot }: SnapshotProbeProps) {
  const data = useServerSnapshotQuery({
    queryKey: ["snapshot-probe"],
    snapshot,
  });

  return createElement("span", null, data.count);
}

describe("useServerSnapshotQuery", () => {
  it("기존 무기한 cache보다 새 서버 snapshot을 첫 렌더에 우선한다", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["snapshot-probe"], { count: 1 });

    const markup = renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(SnapshotProbe, { snapshot: { count: 2 } })
      )
    );

    expect(markup).toBe("<span>2</span>");
  });
});
