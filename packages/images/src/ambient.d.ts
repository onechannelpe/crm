declare module "*?responsive" {
  const value: import("./components/responsive-image").ImageSource;
  export default value;
}

declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}
