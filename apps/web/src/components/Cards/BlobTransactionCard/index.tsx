import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { animated, useSpring } from "@react-spring/web";

import dayjs from "~/dayjs";
import { type Block } from "~/types";
import { buildBlobRoute, buildTransactionRoute } from "~/utils";
import { Link } from "../../Link";
import { CardBase } from "../Bases";

const AddressLabel: React.FC<{
  address: string;
}> = function ({ address }) {
  return (
    <Link href="#">
      {<span className={`truncate text-xs`}>{address}</span>}
    </Link>
  );
};

const CollapseIcon: React.FC<{
  opened: boolean;
  onClick(): void;
}> = function ({ onClick, opened }) {
  const props = useSpring({
    from: { rotate: 0 },
    to: { rotate: Number(opened) * 180 },
  });

  return (
    <div className="flex cursor-pointer flex-col" onClick={onClick}>
      <animated.div style={props}>
        <ChevronUpIcon className="h-4 w-4" />
      </animated.div>
      <animated.div style={props}>
        <ChevronDownIcon className="h-4 w-4" />
      </animated.div>
    </div>
  );
};

type BlobTransactionCardProps = {
  block?: Pick<Block, "timestamp" | "number">;
  transaction: Block["transactions"][0];
};

export const BlobTransactionCard: React.FC<BlobTransactionCardProps> =
  function ({ block, transaction: { hash, from, to, blobs } }) {
    const [opened, setOpened] = useState(false);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const contentHeight = useRef<number>(0);
    const props = useSpring({
      from: { openProgress: 0 },
      to: { openProgress: Number(opened) },
    });

    const updateHeight = useCallback(() => {
      if (contentRef.current) {
        contentHeight.current = contentRef.current.clientHeight;
      }
    }, []);

    const handleContentRef = useCallback(
      (element: HTMLDivElement) => {
        contentRef.current = element;
        updateHeight();
      },
      [updateHeight],
    );

    useEffect(updateHeight, [opened, updateHeight]);

    return (
      <div>
        <CardBase className="rounded-none rounded-t-md">
          <div className="flex flex-col justify-between text-sm md:flex-row">
            <div className="flex w-full items-center gap-3">
              <CollapseIcon
                opened={opened}
                onClick={() => {
                  setOpened((op) => !op);
                }}
              />
              <div className="flex flex-col space-y-2 truncate">
                <div className="flex flex-col gap-2 md:flex-row">
                  <div className="font-semibold">Transaction</div>
                  <Link href={buildTransactionRoute(hash)}>{hash}</Link>
                </div>
                <div className="flex flex-col md:flex-row md:items-center md:space-x-2">
                  <div className="md:hidden">From</div>
                  <AddressLabel address={from} />
                  <ArrowRightIcon className="hidden h-2 w-2 md:block" />
                  <div className="md:hidden">To</div>
                  <AddressLabel address={to} />
                </div>
                <div className="mb-2 text-sm">{blobs.length} Blobs</div>
              </div>
            </div>
            {block && (
              <div className="hidden space-y-2 self-center md:flex md:flex-col">
                <Link href="#">
                  <span>Block #{block.number}</span>
                </Link>
                <div className="text-xs italic text-contentSecondary-light dark:text-contentSecondary-dark">
                  {dayjs.unix(block.timestamp).fromNow()}
                </div>
              </div>
            )}
          </div>
        </CardBase>
        <div className="overflow-hidden pr-4 dark:bg-primary-900">
          <animated.div
            style={{
              height: props.openProgress.to(
                (value) => `${value * contentHeight.current}px`,
              ),
            }}
          >
            <div
              ref={handleContentRef}
              className="ml-10 grid grid-cols-[1fr_6fr]	 gap-2 p-2 text-sm"
            >
              <div></div>
              <div className="font-semibold">Versioned Hash</div>
              {blobs.map((b) => (
                <>
                  <div>
                    <Link
                      key={b.versionedHash}
                      href={buildBlobRoute(hash, b.index)}
                    >
                      Blob {b.index}
                    </Link>
                  </div>
                  <div className=" truncate text-xs">{b.versionedHash}</div>
                </>
              ))}
            </div>
          </animated.div>
        </div>
      </div>
    );
  };
