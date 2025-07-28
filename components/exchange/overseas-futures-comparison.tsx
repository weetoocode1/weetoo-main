"use client";

import { Fragment, useState } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDownIcon, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Platform = {
  id: string;
  name: string;
  logo: string;
  logoColor: string;
  website: string;
  accountType: string;
  minimumMargin: string;
  minimumSpread: string;
  event: string;
  description?: string;
  features?: string[];
  specialOffer?: string;
};

const PLATFORMS: Platform[] = [
  {
    id: "avatrade",
    name: "AVATRADE",
    logo: "A",
    logoColor: "#E91E63",
    website: "avatrade.com",
    accountType: "MT4 MT5\nAVA SOCIAL\n유튜버페이아웃",
    minimumMargin: "STANDARD\nVIP\nECN",
    minimumSpread: "$30",
    event: "입금 20% 크레딧",
    // specialOffer: "가입환영 $50\n$3 페이백",
    description:
      "아바트레이드는 영국 금융감독원(FCA) 규제 아래 운영되는 FX&CFD 트레이딩 플랫폼으로 전세계적으로 인정받는 브로커입니다.",
    features: [
      "AVA SOCIAL 커뮤니티 트레이딩 지원",
      "최저 트레이딩 비용과 투명한 실행 제공하며 제로",
      "MYT Alpine FX 등의 Alpine Endurance 브랜드 제휴되어",
      "세계 유명 플랫폼 지수 제공과 보호된 (레버리지 포함)",
    ],
  },
  {
    id: "infinox",
    name: "INFINOX",
    logo: "I",
    logoColor: "#8BC34A",
    website: "infinox.com",
    accountType: "MT4 MT5\nIX SOCIAL",
    minimumMargin: "STP\nECN",
    minimumSpread: "$30",
    event: "입금 20% 크레딧",
    description:
      "인피녹스는 글로벌 온라인 트레이딩 브로커로 다양한 금융상품과 고급 트레이딩 도구를 제공합니다.",
    features: [
      "IX SOCIAL 소셜 트레이딩 플랫폼",
      "낮은 스프레드와 빠른 체결",
      "다양한 계좌 유형 제공",
      "전문적인 고객 지원 서비스",
    ],
  },
  {
    id: "gomarket",
    name: "GO MARKET",
    logo: "G",
    logoColor: "#E91E63",
    website: "gomarkets.com",
    accountType: "MT4 MT5\nGENISIUS",
    minimumMargin: "GO PLUS\nSTANDARD\nMICRO",
    minimumSpread: "$30",
    event: "입금 20% 크레딧",
    description:
      "고마켓은 호주 기반의 글로벌 브로커로 안정적인 트레이딩 환경과 경쟁력 있는 조건을 제공합니다.",
    features: [
      "GENISUIS 고급 트레이딩 플랫폼",
      "다양한 계좌 옵션 (GO PLUS, STANDARD, MICRO)",
      "호주 ASIC 규제 하에 운영",
      "24/5 고객 지원 서비스",
    ],
  },
  {
    id: "xm",
    name: "XM",
    logo: "X",
    logoColor: "#3F51B5",
    website: "xm.com",
    accountType: "MT4 MT5",
    minimumMargin: "MICRO\nSTANDARD\nULTRAROW",
    minimumSpread: "$30",
    event: "입금 20% 크레딧",
    description:
      "XM은 전 세계적으로 인정받는 온라인 트레이딩 브로커로 다양한 금융상품과 교육 자료를 제공합니다.",
    features: [
      "ULTRAROW 초저스프레드 계좌",
      "포괄적인 교육 프로그램",
      "다중 규제 라이선스 보유",
      "무료 VPS 서비스 제공",
    ],
  },
  {
    id: "landfx",
    name: "LAND FX",
    logo: "L",
    logoColor: "#00BCD4",
    website: "land-fx.com",
    accountType: "MT4 MT5",
    minimumMargin: "-",
    minimumSpread: "$30",
    event: "입금 20% 크레딧",
    description:
      "랜드FX는 뉴질랜드 기반의 브로커로 투명한 거래 환경과 경쟁력 있는 스프레드를 제공합니다.",
    features: [
      "투명한 거래 환경",
      "경쟁력 있는 스프레드",
      "빠른 주문 체결",
      "다양한 입출금 방법",
    ],
  },
  {
    id: "apmarket",
    name: "AP MARKET",
    logo: "A",
    logoColor: "#8BC34A",
    website: "apmarkets.com",
    accountType: "MT4 MT5",
    minimumMargin: "-",
    minimumSpread: "$30",
    event: "입금 20% 크레딧",
    description:
      "AP마켓은 글로벌 온라인 트레이딩 브로커로 안정적인 서비스와 다양한 트레이딩 도구를 제공합니다.",
    features: [
      "안정적인 트레이딩 플랫폼",
      "다양한 분석 도구 제공",
      "전문적인 고객 서비스",
      "경쟁력 있는 거래 조건",
    ],
  },
];

const columns: ColumnDef<Platform>[] = [
  {
    header: "플랫폼",
    accessorKey: "name",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        {row.getCanExpand() && (
          <Button
            className="size-7 shadow-none text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              row.getToggleExpandedHandler()();
            }}
            aria-expanded={row.getIsExpanded()}
            aria-label={row.getIsExpanded() ? `접기` : `펼치기`}
            size="icon"
            variant="ghost"
          >
            <ChevronDownIcon
              className="transition-transform duration-200"
              style={{
                transform: row.getIsExpanded()
                  ? "rotate(-180deg)"
                  : "rotate(0deg)",
              }}
              size={16}
              aria-hidden="true"
            />
          </Button>
        )}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
          style={{ backgroundColor: row.original.logoColor }}
        >
          {row.original.logo}
        </div>
        <div className="font-medium">{row.getValue("name")}</div>
      </div>
    ),
  },
  {
    header: () => <div className="text-center">계좌유형</div>,
    accessorKey: "accountType",
    cell: ({ row }) => (
      <div className="text-center text-sm">
        {String(row.getValue("accountType"))
          .split("\n")
          .map((line: string, index: number) => (
            <div key={index}>{line}</div>
          ))}
      </div>
    ),
  },
  {
    header: () => <div className="text-center">최소 증거금</div>,
    accessorKey: "minimumMargin",
    cell: ({ row }) => (
      <div className="text-center text-sm">
        {String(row.getValue("minimumMargin"))
          .split("\n")
          .map((line: string, index: number) => (
            <div key={index}>{line}</div>
          ))}
      </div>
    ),
  },
  {
    header: () => <div className="text-center">최소스프레드</div>,
    accessorKey: "minimumSpread",
    cell: ({ row }) => (
      <div className="text-center font-medium">
        {row.getValue("minimumSpread")}
      </div>
    ),
  },
  {
    header: () => <div className="text-center">이벤트</div>,
    accessorKey: "event",
    cell: ({ row }) => (
      <div className="text-center flex flex-col items-center gap-2">
        {row.original.specialOffer && (
          <div className="text-sm">
            {row.original.specialOffer
              .split("\n")
              .map((line: string, index: number) => (
                <div key={index} className="text-red-600 font-medium">
                  {line}
                </div>
              ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-red-200 text-red-600 dark:border-red-800 dark:text-red-400"
          >
            {row.getValue("event")}
          </Badge>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" asChild>
            <a
              href={`https://${row.original.website}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </Button>
        </div>
      </div>
    ),
  },
];

export const OverseasFuturesComparison = () => {
  const [, setHoveredRow] = useState<string | null>(null);

  const table = useReactTable({
    data: PLATFORMS,
    columns,
    getRowCanExpand: (row) => Boolean(row.original.description),
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  return (
    <div className="w-full">
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="hover:bg-transparent border-b border-border"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="bg-transparent border-r border-border last:border-r-0"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <Fragment key={row.id}>
                  <TableRow
                    key={row.id}
                    className="cursor-pointer border-b border-border"
                    onMouseEnter={() => setHoveredRow(row.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    onClick={() => row.toggleExpanded()}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="whitespace-nowrap border-r border-border last:border-r-0"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  <AnimatePresence>
                    {row.getIsExpanded() && (
                      <tr>
                        <td
                          colSpan={row.getVisibleCells().length}
                          className="p-0 border-0"
                        >
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden border-b border-border"
                          >
                            <div className="p-6 bg-muted/30">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <h4 className="font-semibold mb-3">
                                    {row.original.name} 상세 정보
                                  </h4>
                                  <p className="text-sm mb-4">
                                    {row.original.description}
                                  </p>
                                  <div className="space-y-2">
                                    {row.original.features?.map(
                                      (feature, index) => (
                                        <div
                                          key={index}
                                          className="flex items-center gap-2"
                                        >
                                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                          <span className="text-sm">
                                            {feature}
                                          </span>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col justify-center items-end">
                                  <div className="space-y-3 w-full max-w-xs">
                                    <Button
                                      variant="outline"
                                      className="w-full"
                                    >
                                      간편 계좌 등록
                                    </Button>
                                    <Button
                                      className="w-full bg-red-500 hover:bg-red-600 text-white"
                                      asChild
                                    >
                                      <a
                                        href={`https://${row.original.website}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        가입하기{" "}
                                        <ExternalLink className="w-4 h-4 ml-2" />
                                      </a>
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
