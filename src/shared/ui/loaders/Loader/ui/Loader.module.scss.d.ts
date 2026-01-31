import globalClassNames from "../../../../app/styles/types/style.d";

declare const classNames: typeof globalClassNames & {
  readonly Loader: "Loader";
  readonly loading: "loading";
  readonly loop_wrapper: "loop_wrapper";
  readonly loop_first: "loop_first";
  readonly loop_second: "loop_second";
};
export = classNames;

