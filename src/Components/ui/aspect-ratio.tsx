import { AspectRatio } from "@/Components/ui/aspect-ratio";

export default function ExampleAspectRatio() {
  return (
    <div className="w-[400px]">
      <AspectRatio ratio={16 / 9}>
        <img
          src="https://placehold.co/600x400"
          alt="Ejemplo de imagen"
          className="rounded-md object-cover"
        />
      </AspectRatio>
    </div>
  );
}
