from pydantic import BaseModel

class TumorPredictRequestDto(BaseModel):
    image: str  # base64 encoded image

class TumorPredictResponseDto(BaseModel):
    segmentation: str  # base64 encoded mask
    success: bool
    message: str = ""
