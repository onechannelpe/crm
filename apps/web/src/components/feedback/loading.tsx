import LoaderCircle from "~/components/icons/loader-circle";

interface LoadingProps {
    size?: "sm" | "md" | "lg";
}

export function Loading(props: LoadingProps) {
    const sizeClass = () => {
        switch (props.size) {
            case "sm":
                return "w-4 h-4";
            case "lg":
                return "w-12 h-12";
            default:
                return "w-8 h-8";
        }
    };

    return (
        <div class="flex items-center justify-center p-8">
            <LoaderCircle class={`${sizeClass()} animate-spin text-blue-600`} />
        </div>
    );
}
